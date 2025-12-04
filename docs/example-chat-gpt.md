'use server';
import {z} from 'zod';
import {generateObject} from 'ai';
import {revalidatePath} from 'next/cache';
import {mistral} from '@ai-sdk/mistral';
import {openai} from '@ai-sdk/openai';
import {google} from '@ai-sdk/google';
import {createClient} from '@/utils/supabase/server';
import {getUserProfile} from '@/features/ai-writer/actions/getUserProfile';
import {formatDate} from '@/utils/custom/formatDate';
import {ARRAY_SECTIONS, UserProfile} from '@/lib/profile/userProfileTypes';
import {extractionSchema, createExtractionSchema} from './extractionSchema';
import {updateEntireProfile} from '../../../../utils/user-profle-tools/updateEntireProfile';

import chargeCredits from '@/utils/stripe/chargeCredits';
import hasEnoughCredits from '@/utils/stripe/hasEnoughCredits';
import {credits} from '@/lib/credits';
import {filterUniqueProfileData} from '../../../../utils/user-profle-tools/filterUniqueProfileData';
import {areAllArraySectionsEmpty} from '../../../../utils/custom/areAllArraySectionsEmpty';

import {WebPDFLoader} from '@langchain/community/document_loaders/web/pdf';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import {queueNotification} from '../../../../utils/notifications/serverNotification';
import {ensureMinHtmlContent} from '../../../../utils/custom/normalizeToHtml';
import {azureClient} from '@/utils/ai/azureClient';

const model = azureClient(process.env.AZURE_CHAT_MODEL!);
// const model = mistral('pixtral-12b-2409');
// const model = openai('gpt-4.1-mini');
// const model = mistral('pixtral-large-latest');

async function getUserSkillCategories(userId: string): Promise<string[]> {
    const supabase = await createClient();

    const { data: skills, error } = await supabase
        .from('skills')
        .select('category')
        .eq('user_id', userId)
        .not('category', 'is', null);

    if (error || !skills) {
        return [];
    }

    // Extract unique categories and filter out empty strings
    const uniqueCategories = [...new Set(skills.map(skill => skill.category.trim()))]
        .filter(category => category.length > 0);

    return uniqueCategories;
}

async function extractDataFromImage(
    imageBase64: string,
    userProfile: UserProfile,
    userId: string,
    pageInfo: string = ''
) {
    // Get user's existing skill categories for context
    const existingSkillCategories = await getUserSkillCategories(userId);
    const dynamicSchema = createExtractionSchema(existingSkillCategories);
    const basePrompt = `
   ## CV/Resume Data Extraction

    ### Document Analysis Instructions
    - Extract information ONLY from CV, resume, cover letter or motivation letter documents
    - If the document is blank, irrelevant, or not a professional document, return an empty object
    - Extract ONLY data that is explicitly present
    - Focus on accuracy and completeness in extraction
    - Always avoid inventing, assuming, or fabricating any information

    ### Formatting Standards
    1. Date Formatting
       - Convert all dates to ISO format (YYYY-MM-DD)
    2. Name Formatting
       - Capitalize first letter of names
       - Keep remaining letters lowercase
       - Example: "John Doe" (not "JOHN DOE" or "john doe")
    3. Summary Extraction
       - Compile as a single, cohesive paragraph
       - No line breaks or unnecessary formatting
    4. URL Formatting
        - Ensure all URLs include proper protocol prefix (http:// or https://)
        - For website links without explicit protocol, add "https://" prefix
        - Example: "linkedin.com/in/username" should be formatted as "https://linkedin.com/in/username"
        - Validate basic URL structure (must contain domain and TLD)


     ### Validation Requirements
        - Every object in array sections MUST include all required fields, even if empty
        - For all description fields, always provide at least an empty string ("") rather than undefined/null
        - For education entries, ensure each has a non-null description field (use "" if not found)
        - For all date fields that are not found, use null rather than undefined
        - For nested objects (like fieldOfStudy), ensure all properties exist with at least empty strings
        - Ensure all ID fields are properly generated for new entries
    
    #### Skills Assessment
    - Quantify skill proficiency on a 5-point scale:
      1: Beginner
      2: Basic Proficiency
      3: Intermediate
      4: Advanced
      5: Expert
    - Base level on contextual evidence in the document
    
    #### Language Proficiency Levels
    Use only these predefined levels:
    - beginner (map terms like: basic, minimal, novice)
    - elementary (map terms like: fair, fundamental, rudimentary)
    - intermediate (map terms like: conversational, working knowledge, moderate)
    - advanced (map terms like: fluent, proficient in most contexts, highly competent)
    - proficient (map terms like: business level, near-native, full professional)
    - native (map terms like: mother tongue, first language, bilingual from birth)
    
    #### Career History and Education Description Formatting
    Permitted HTML tags for enhanced readability:
    - <p>: Paragraph structuring
    - <strong>: Emphasize key achievements
    - <em>: Highlight important context
    - <ul>: Unordered lists
    - <li>: List items
    
    ### Output Instructions
    - Provide structured, clean, and precise data extraction
    - Adhere strictly to specified schema definitions
    - Handle optional fields appropriately
    - Provide empty arrays for sections not present in document 
    - Include all data visible in the document that fits the schema
    - Return empty object if document is not a professional CV/resume/cover letter
    `;

    const pagePrompt = pageInfo ? `${basePrompt}\n${pageInfo}` : basePrompt;

    const result = await generateObject({
        model,
        mode: 'tool',
        schema: dynamicSchema,
        messages: [
            {
                role: 'user',
                content: [
                    {type: 'text', text: pagePrompt},
                    {type: 'image', image: imageBase64},
                ],
            },
        ],
    });

    console.log('usage:', result.usage);

    // Only charge credits if extraction was successful and userId is provided
    if (result?.finishReason !== 'error' && userId) {
        await chargeCredits(userId, credits.extractProfileData);
    }

    return formatExtractedData(result.object);
}

async function extractDataFromDocument(documentText: string, userProfile: UserProfile, userId: string) {
    // Get user's existing skill categories for context
    const existingSkillCategories = await getUserSkillCategories(userId);
    const dynamicSchema = createExtractionSchema(existingSkillCategories);

    const basePrompt = `
   ## CV/Resume Data Extraction

    ### Document Analysis Instructions
    - Extract information ONLY from CV, resume, cover letter or motivation letter documents
    - If the document is blank, irrelevant, or not a professional document, return an empty object
    - Extract ONLY data that is explicitly present
    - Focus on accuracy and completeness in extraction
    - Always avoid inventing, assuming, or fabricating any information

    ### Formatting Standards
    1. Date Formatting
       - Convert all dates to ISO format (YYYY-MM-DD)
    2. Name Formatting
       - Capitalize first letter of names
       - Keep remaining letters lowercase
       - Example: "John Doe" (not "JOHN DOE" or "john doe")
    3. Summary Extraction
       - Compile as a single, cohesive paragraph
       - No line breaks or unnecessary formatting
    4. URL Formatting
        - Ensure all URLs include proper protocol prefix (http:// or https://)
        - For website links without explicit protocol, add "https://" prefix
        - Example: "linkedin.com/in/username" should be formatted as "https://linkedin.com/in/username"
        - Validate basic URL structure (must contain domain and TLD)


    ### Specialized Extraction Guidelines
    
    #### Skills Assessment
    - Quantify skill proficiency on a 5-point scale:
      1: Beginner
      2: Basic Proficiency
      3: Intermediate
      4: Advanced
      5: Expert
    - Base level on contextual evidence in the document
    
    #### Language Proficiency Levels
    Use only these predefined levels:
    - beginner (map terms like: basic, minimal, novice)
    - elementary (map terms like: fair, fundamental, rudimentary)
    - intermediate (map terms like: conversational, working knowledge, moderate)
    - advanced (map terms like: fluent, proficient in most contexts, highly competent)
    - proficient (map terms like: business level, near-native, full professional)
    - native (map terms like: mother tongue, first language, bilingual from birth)
    
    #### Career History and Education Description Section Formatting
    Permitted HTML tags for enhanced readability:
    - <p>: Paragraph structuring
    - <strong>: Emphasize key achievements
    - <em>: Highlight important context
    - <ul>: Unordered lists
    - <li>: List items
    for example: <p>Developing full stack web applications</p><ul><li><p>React, <strong><em>Typescript</em></strong><em>, PostgreSQL,</em> GraphQI </p></li><li><p><strong>SpringBoot</strong>, JPA</p></li></ul>
    
    ### Output Instructions
    - Provide structured, clean, and precise data extraction
    - Adhere strictly to specified schema definitions
    - Handle optional fields appropriately
    - Provide empty arrays for sections not present in document 
    - Include all data visible in the document that fits the schema
    - Return empty object if document is not a professional CV/resume/cover letter

    ### Document Content to Extract From:
    ${documentText}
    `;

    const result = await generateObject({
        mode: 'tool',
        model,
        schema: dynamicSchema,
        messages: [
            {
                role: 'user',
                content: [{type: 'text', text: basePrompt}],
            },
        ],
    });

    console.log('usage:', result.usage);

    // Only charge credits if extraction was successful and userId is provided
    if (result?.finishReason !== 'error' && userId) {
        await chargeCredits(userId, credits.extractProfileData);
    }

    return formatExtractedData(result.object);
}

async function getFileDetails(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type;
    const buffer = Buffer.from(arrayBuffer);
    return {
        arrayBuffer,
        buffer,
        mimeType,
        base64: `data:${mimeType};base64,${buffer.toString('base64')}`,
    };
}

function validateCSVSecurity(parsed: any): void {
    if (!parsed.data || parsed.data.length === 0) {
        throw new Error('No data found in CSV file');
    }

    // Row limit - reasonable for personal profile data
    if (parsed.data.length > 100) {
        throw new Error('CSV contains too many rows (max: 100). Please use a personal profile export only.');
    }

    // Column limit - typical for profile fields
    const headers = Object.keys(parsed.data[0] || {});
    if (headers.length > 50) {
        throw new Error('CSV contains too many columns (max: 50).');
    }

    // Cell size validation - check first 10 rows for performance
    for (const row of parsed.data.slice(0, 10)) {
        for (const [key, value] of Object.entries(row)) {
            if (value && value.toString().length > 2000) {
                throw new Error(`CSV cell too large in column "${key}" (max: 2000 characters)`);
            }
        }
    }
}

function convertCSVToProfileText(csvData: any[]): string {
    if (!csvData || csvData.length === 0) {
        throw new Error('No data found in CSV file');
    }

    // Simple JSON conversion - let the LLM handle field mapping and interpretation
    const csvText = `CSV Profile Data (${csvData.length} ${
        csvData.length === 1 ? 'record' : 'records'
    }):\n${JSON.stringify(csvData, null, 2)}`;

    return csvText;
}

async function extractTextFromDocumentWithLangchain(file: File): Promise<string> {
    try {
        let text = '';
        const PAGE_LIMIT = 3;

        if (file.type === 'application/pdf') {
            const pdfBlob = new Blob([await file.arrayBuffer()], {type: 'application/pdf'});
            const loader = new WebPDFLoader(pdfBlob, {
                splitPages: true,
            });

            const docs = await loader.load();
            const limitedDocs = docs.slice(0, PAGE_LIMIT);
            text = limitedDocs.map((doc) => doc.pageContent).join('\n\n');
            // if (docs.length > PAGE_LIMIT) {
            //     console.log('docs:', docs.length);
            //     queueNotification({
            //         message: 'Page extraction limit: 3',
            //         severity: 'success',
            //         duration: 2000,
            //     });
            // }
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await mammoth.extractRawText({buffer});
            let fullText = result.value;

            fullText = fullText.replace(/\n\s+/g, '\n');
            const CHAR_LIMIT = 9000;
            text = fullText.substring(0, CHAR_LIMIT);

            // if (fullText.length > CHAR_LIMIT) {
            //     console.log(
            //         `Word document truncated from ${fullText.length} to ${CHAR_LIMIT} characters (approx. 3 pages)`
            //     );
            //     queueNotification({
            //         message: 'Page extraction limit 9000 character',
            //         severity: 'warning',
            //         duration: 2000,
            //     });
            // }
        } else if (
            file.type === 'text/csv' ||
            file.type === 'application/csv' ||
            file.name.toLowerCase().endsWith('.csv')
        ) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const csvText = buffer.toString('utf-8');

            // Parse CSV and convert to structured text
            const parsed = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.toLowerCase().trim(),
            });

            if (parsed.errors.length > 0) {
                throw new Error(`CSV parsing errors: ${parsed.errors.map((e) => e.message).join(', ')}`);
            }

            // Security validation
            validateCSVSecurity(parsed);

            // Convert CSV data to structured text format - let LLM handle the interpretation
            text = convertCSVToProfileText(parsed.data);
        } else {
            throw new Error(`Unsupported file type: ${file.type}`);
        }

        return text;
    } catch (error) {
        console.error('Error extracting text from document:', error);
        throw error;
    }
}

function formatExtractedData(extractedData: z.infer<typeof extractionSchema>): z.infer<typeof extractionSchema> {
    const ensureMinLength = (text: string | undefined | null, minLength: number = 3): string => {
        if (!text || text.trim().length < minLength) return '---';
        return text;
    };

    return {
        ...extractedData,
        general: extractedData.general
            ? {
                  ...extractedData.general,
                  firstName: extractedData.general.firstName || '',
                  lastName: extractedData.general.lastName || '',
                  email: extractedData.general.email || '',
                  phoneNumber: extractedData.general.phoneNumber || '',
                  city: extractedData.general.city || '',
                  country: extractedData.general.country || '',
                  postCode: extractedData.general.postCode || '',
                  qualificationTitle: extractedData.general.qualificationTitle || '',
              }
            : {
                  firstName: '',
                  lastName: '',
                  email: '',
                  phoneNumber: '',
                  city: '',
                  country: '',
                  postCode: '',
                  qualificationTitle: '',
              },
        summary: extractedData.summary ? {
            summary: extractedData.summary.summary || ''
        } : {summary: ''},
        education: (extractedData.education || []).map((edu) => ({
            ...edu,
            schoolName: ensureMinLength(edu.schoolName || ''),
            schoolLocation: ensureMinLength(edu.schoolLocation || ''),
            degree: ensureMinLength(edu.degree || ''),
            description: ensureMinLength(edu.description || ''),
            startDate: formatDate(edu.startDate),
            graduationDate: formatDate(edu.graduationDate),
            fieldOfStudy: {
                groupTitle: edu.fieldOfStudy?.groupTitle || 'Other',
                groupTitleTranslated: edu.fieldOfStudy?.groupTitleTranslated || 'Other',
                value: edu.fieldOfStudy?.value || 'Other',
                valueTranslated: edu.fieldOfStudy?.valueTranslated || 'Other',
            },
        })),
        careerHistory: (extractedData.careerHistory || []).map((job) => ({
            ...job,
            jobTitle: ensureMinLength(job.jobTitle || ''),
            employer: ensureMinLength(job.employer || ''),
            location: ensureMinLength(job.location || ''),
            description: ensureMinLength(job.description || ''),
            startDate: formatDate(job.startDate),
            endDate: formatDate(job.endDate),
        })),
        skills: (extractedData.skills || []).map((skill) => ({
            ...skill,
            skill: ensureMinLength(skill.skill || ''),
            category: skill.category || 'Other',
            level: skill.level || 3,
        })),
        certifications: (extractedData.certifications || []).map((cert) => ({
            ...cert,
            certificationName: ensureMinLength(cert.certificationName || ''),
            issuingOrganization: ensureMinLength(cert.issuingOrganization || ''),
            date: formatDate(cert.date),
        })),
        languages: (extractedData.languages || []).map((lang) => ({
            ...lang,
            language: ensureMinLength(lang.language || ''),
            level: lang.level || {
                optionKey: 'intermediate',
                optionValue: 'Intermediate',
            },
        })),
        projects: (extractedData.projects || []).map((project) => ({
            ...project,
            projectName: ensureMinLength(project.projectName || ''),
            role: project.role || '',
            description: ensureMinLength(project.description || ''),
            startDate: formatDate(project.startDate),
            endDate: formatDate(project.endDate),
        })),
        publications: (extractedData.publications || []).map((pub) => ({
            ...pub,
            title: ensureMinLength(pub.title || ''),
            publisher: pub.publisher || '',
            description: ensureMinLength(pub.description || ''),
            date: formatDate(pub.date),
        })),
        webLinks: (extractedData.webLinks || []).map((link) => ({
            ...link,
            title: link.title || '',
            url: link.url || '',
        })),
        volunteerExperiences: (extractedData.volunteerExperiences || []).map((vol) => ({
            ...vol,
            organizationName: ensureMinLength(vol.organizationName || ''),
            role: ensureMinLength(vol.role || ''),
            description: ensureMinLength(vol.description || ''),
            startDate: formatDate(vol.startDate),
            endDate: formatDate(vol.endDate),
        })),
        awards: (extractedData.awards || []).map((award) => ({
            ...award,
            title: ensureMinLength(award.title || ''),
            awarder: ensureMinLength(award.awarder || ''),
            description: ensureMinLength(award.description || ''),
            date: formatDate(award.date),
        })),
        publicEngagments: (extractedData.publicEngagments || []).map((eng) => ({
            ...eng,
            title: ensureMinLength(eng.title || ''),
            organization: ensureMinLength(eng.organization || ''),
            description: ensureMinLength(eng.description || ''),
            startDate: formatDate(eng.startDate),
            endDate: formatDate(eng.endDate),
        })),
        proMemberships: (extractedData.proMemberships || []).map((mem) => ({
            ...mem,
            organizationName: ensureMinLength(mem.organizationName || ''),
            membershipType: mem.membershipType || '',
            description: ensureMinLength(mem.description || ''),
            startDate: formatDate(mem.startDate),
            endDate: formatDate(mem.endDate),
        })),
        references: (extractedData.references || []).map((ref) => ({
            ...ref,
            name: ref.name || '',
            relationship: ref.relationship || '',
            contactInformation: ensureMinLength(ref.contactInformation || ''),
        })),
        hobbies: (extractedData.hobbies || []).map((hobby) => ({
            ...hobby,
            hobby: ensureMinLength(hobby.hobby || ''),
            description: ensureMinLength(hobby.description || ''),
        })),
    };
}

function shouldUpdateProfile(existingProfile: UserProfile, extractedData: z.infer<typeof extractionSchema>): boolean {
    const ENFORCE_NAME_MATCHING = false;

    if (!ENFORCE_NAME_MATCHING) return true;

    if (!extractedData.general || !existingProfile.general) {
        return true;
    }

    if (!extractedData.general.firstName || !extractedData.general.lastName) {
        return true;
    }

    // const trimmedFirstName = extractedData.general.firstName.trim().toLowerCase();
    // const trimmedLastName = extractedData.general.lastName.trim().toLowerCase();

    // const firstNameMatch = trimmedFirstName === existingProfile.general.firstName.toLowerCase();
    // const lastNameMatch = trimmedLastName === existingProfile.general.lastName.toLowerCase();

    // return firstNameMatch && lastNameMatch;
    return true;
}

function transformExtractedToUserProfile(extractedData: z.infer<typeof extractionSchema>): Partial<UserProfile> {
    const ensureMinLength = (text: string | undefined | null, minLength: number = 3): string => {
        if (!text || text.trim().length < minLength) return '---';
        return text;
    };

    const userProfileData: Partial<UserProfile> = {
        general: extractedData.general
            ? {
                  firstName: extractedData.general.firstName || '',
                  lastName: extractedData.general.lastName || '',
                  email: extractedData.general.email || '',
                  phoneNumber: extractedData.general.phoneNumber || '',
                  city: extractedData.general.city || '',
                  country: extractedData.general.country || '',
                  postCode: extractedData.general.postCode || '',
                  qualificationTitle: extractedData.general.qualificationTitle || '',
              }
            : {
                  firstName: '',
                  lastName: '',
                  email: '',
                  phoneNumber: '',
                  city: '',
                  country: '',
                  postCode: '',
                  qualificationTitle: '',
              },
    };

    if (extractedData.summary?.summary) {
        userProfileData.summary = {
            summary: extractedData.summary.summary,
        };
    }

    if (extractedData.skills && extractedData.skills.length > 0) {
        userProfileData.skills = extractedData.skills.map((skill) => ({
            id: crypto.randomUUID(),
            skill: ensureMinLength(skill.skill || ''),
            category: skill.category || 'Other',
            level: skill.level || 3,
            visible: true,
        }));
    }

    if (extractedData.education && extractedData.education.length > 0) {
        userProfileData.education = extractedData.education.map((edu) => ({
            id: crypto.randomUUID(),
            schoolName: ensureMinLength(edu.schoolName || ''),
            schoolLocation: ensureMinLength(edu.schoolLocation || ''),
            degree: ensureMinLength(edu.degree || ''),
            description: ensureMinHtmlContent(edu.description || ''),
            startDate: edu.startDate,
            graduationDate: edu.graduationDate,
            fieldOfStudy: {
                groupTitle: edu.fieldOfStudy?.groupTitle || 'General',
                groupTitleTranslated: edu.fieldOfStudy?.groupTitleTranslated || 'General',
                value: edu.fieldOfStudy?.value || '',
                valueTranslated: edu.fieldOfStudy?.valueTranslated || '',
            },
            visible: true,
        }));
    }

    if (extractedData.careerHistory && extractedData.careerHistory.length > 0) {
        userProfileData.careerHistory = extractedData.careerHistory.map((job) => ({
            id: crypto.randomUUID(),
            jobTitle: ensureMinLength(job.jobTitle || ''),
            employer: ensureMinLength(job.employer || ''),
            location: ensureMinLength(job.location || ''),
            description: ensureMinHtmlContent(job.description || ''),
            startDate: job.startDate || null,
            endDate: job.endDate,
            visible: true,
        }));
    }

    if (extractedData.certifications && extractedData.certifications.length > 0) {
        userProfileData.certifications = extractedData.certifications.map((cert) => ({
            id: crypto.randomUUID(),
            certificationName: ensureMinLength(cert.certificationName || ''),
            issuingOrganization: ensureMinLength(cert.issuingOrganization || ''),
            date: cert.date,
            visible: true,
        }));
    }

    if (extractedData.languages && extractedData.languages.length > 0) {
        userProfileData.languages = extractedData.languages.map((lang) => ({
            id: crypto.randomUUID(),
            language: ensureMinLength(lang.language || ''),
            level: lang.level || {
                optionKey: 'intermediate',
                optionValue: 'Intermediate',
            },
            visible: true,
        }));
    }

    if (extractedData.projects && extractedData.projects.length > 0) {
        userProfileData.projects = extractedData.projects.map((project) => ({
            id: crypto.randomUUID(),
            projectName: ensureMinLength(project.projectName || ''),
            role: project.role || '',
            description: ensureMinLength(project.description || ''),
            link: project.link,
            startDate: project.startDate,
            endDate: project.endDate,
            visible: true,
        }));
    }

    if (extractedData.publications && extractedData.publications.length > 0) {
        userProfileData.publications = extractedData.publications.map((pub) => ({
            id: crypto.randomUUID(),
            title: ensureMinLength(pub.title || ''),
            publisher: pub.publisher || '',
            description: ensureMinLength(pub.description || ''),
            date: pub.date,
            link: pub.link,
            visible: true,
        }));
    }

    if (extractedData.volunteerExperiences && extractedData.volunteerExperiences.length > 0) {
        userProfileData.volunteerExperiences = extractedData.volunteerExperiences.map((vol) => ({
            id: crypto.randomUUID(),
            organizationName: ensureMinLength(vol.organizationName || ''),
            role: vol.role || '',
            description: ensureMinLength(vol.description || ''),
            startDate: vol.startDate,
            endDate: vol.endDate,
            visible: true,
        }));
    }

    if (extractedData.webLinks && extractedData.webLinks.length > 0) {
        userProfileData.webLinks = extractedData.webLinks.map((link) => ({
            id: crypto.randomUUID(),
            media: link.title || '',
            link: link.url || '',
            visible: true,
        }));
    }

    if (extractedData.awards && extractedData.awards.length > 0) {
        userProfileData.awards = extractedData.awards.map((award) => ({
            id: crypto.randomUUID(),
            awardName: ensureMinLength(award.title || ''),
            organization: ensureMinLength(award.awarder || ''),
            date: award.date,
            visible: true,
        }));
    }

    if (extractedData.publicEngagments && extractedData.publicEngagments.length > 0) {
        userProfileData.publicEngagments = extractedData.publicEngagments.map((eng) => ({
            id: crypto.randomUUID(),
            name: ensureMinLength(eng.title || ''),
            topic: ensureMinLength(eng.organization || ''),
            description: ensureMinLength(eng.description || ''),
            link: '',
            visible: true,
        }));
    }

    if (extractedData.proMemberships && extractedData.proMemberships.length > 0) {
        userProfileData.proMemberships = extractedData.proMemberships.map((mem) => ({
            id: crypto.randomUUID(),
            organization: ensureMinLength(mem.organizationName || ''),
            description: ensureMinLength(mem.description || ''),
            visible: true,
        }));
    }

    if (extractedData.references && extractedData.references.length > 0) {
        userProfileData.references = extractedData.references.map((ref) => ({
            id: crypto.randomUUID(),
            name: ref.name || '',
            company: ref.relationship || '',
            contact: ensureMinLength(ref.contactInformation || ''),
            visible: true,
        }));
    }

    if (extractedData.hobbies && extractedData.hobbies.length > 0) {
        userProfileData.hobbies = extractedData.hobbies.map((hobby) => ({
            id: crypto.randomUUID(),
            hobbyName: ensureMinLength(hobby.hobby || ''),
            description: ensureMinLength(hobby.description || ''),
            visible: true,
        }));
    }

    // console.log('transformedData:', userProfileData);
    return userProfileData;
}

function mergeProfileData(existingProfile: UserProfile, extractedData: z.infer<typeof extractionSchema>): UserProfile {
    if (!shouldUpdateProfile(existingProfile, extractedData)) {
        console.log('First name and last name do not match. Skipping profile update.');
        return existingProfile;
    }

    const mergedProfile = JSON.parse(JSON.stringify(existingProfile)) as UserProfile;

    const transformedData = transformExtractedToUserProfile(extractedData);

    if (extractedData.general) {
        if (!mergedProfile.general.qualificationTitle) {
            mergedProfile.general.qualificationTitle = extractedData.general.qualificationTitle || '';
        }
        if (!mergedProfile.general.phoneNumber) {
            mergedProfile.general.phoneNumber = extractedData.general.phoneNumber || '';
        }
        if (!mergedProfile.general.city) {
            mergedProfile.general.city = extractedData.general.city || '';
        }
        if (!mergedProfile.general.country) {
            mergedProfile.general.country = extractedData.general.country || '';
        }
        if (!mergedProfile.general.postCode) {
            mergedProfile.general.postCode = extractedData.general.postCode || '';
        }
    }

    if (transformedData.summary?.summary && !mergedProfile.summary?.summary) {
        mergedProfile.summary = transformedData.summary;
    }

    if (transformedData.education && transformedData.education.length > 0) {
        if (!mergedProfile.education) mergedProfile.education = [];
        mergedProfile.education = [...mergedProfile.education, ...transformedData.education];
    }

    if (transformedData.careerHistory && transformedData.careerHistory.length > 0) {
        if (!mergedProfile.careerHistory) mergedProfile.careerHistory = [];
        mergedProfile.careerHistory = [...mergedProfile.careerHistory, ...transformedData.careerHistory];
    }

    if (transformedData.skills && transformedData.skills.length > 0) {
        if (!mergedProfile.skills) mergedProfile.skills = [];

        const existingSkillNames = new Set(mergedProfile.skills.map((s) => s.skill.toLowerCase()));
        const newSkills = transformedData.skills.filter((s) => !existingSkillNames.has(s.skill.toLowerCase()));
        mergedProfile.skills = [...mergedProfile.skills, ...newSkills];
    }

    if (transformedData.certifications && transformedData.certifications.length > 0) {
        if (!mergedProfile.certifications) mergedProfile.certifications = [];
        mergedProfile.certifications = [...mergedProfile.certifications, ...transformedData.certifications];
    }

    if (transformedData.languages && transformedData.languages.length > 0) {
        if (!mergedProfile.languages) mergedProfile.languages = [];
        const existingLanguages = new Set(mergedProfile.languages.map((l) => l.language.toLowerCase()));
        const newLanguages = transformedData.languages.filter((l) => !existingLanguages.has(l.language.toLowerCase()));
        mergedProfile.languages = [...mergedProfile.languages, ...newLanguages];
    }

    if (transformedData.projects && transformedData.projects.length > 0) {
        if (!mergedProfile.projects) mergedProfile.projects = [];
        mergedProfile.projects = [...mergedProfile.projects, ...transformedData.projects];
    }

    if (transformedData.publications && transformedData.publications.length > 0) {
        if (!mergedProfile.publications) mergedProfile.publications = [];
        mergedProfile.publications = [...mergedProfile.publications, ...transformedData.publications];
    }

    if (transformedData.webLinks && transformedData.webLinks.length > 0) {
        if (!mergedProfile.webLinks) mergedProfile.webLinks = [];
        mergedProfile.webLinks = [...mergedProfile.webLinks, ...transformedData.webLinks];
    }

    if (transformedData.volunteerExperiences && transformedData.volunteerExperiences.length > 0) {
        if (!mergedProfile.volunteerExperiences) mergedProfile.volunteerExperiences = [];
        mergedProfile.volunteerExperiences = [
            ...mergedProfile.volunteerExperiences,
            ...transformedData.volunteerExperiences,
        ];
    }

    if (transformedData.awards && transformedData.awards.length > 0) {
        if (!mergedProfile.awards) mergedProfile.awards = [];
        mergedProfile.awards = [...mergedProfile.awards, ...transformedData.awards];
    }

    if (transformedData.publicEngagments && transformedData.publicEngagments.length > 0) {
        if (!mergedProfile.publicEngagments) mergedProfile.publicEngagments = [];
        mergedProfile.publicEngagments = [...mergedProfile.publicEngagments, ...transformedData.publicEngagments];
    }

    if (transformedData.proMemberships && transformedData.proMemberships.length > 0) {
        if (!mergedProfile.proMemberships) mergedProfile.proMemberships = [];
        mergedProfile.proMemberships = [...mergedProfile.proMemberships, ...transformedData.proMemberships];
    }

    if (transformedData.references && transformedData.references.length > 0) {
        if (!mergedProfile.references) mergedProfile.references = [];
        mergedProfile.references = [...mergedProfile.references, ...transformedData.references];
    }

    if (transformedData.hobbies && transformedData.hobbies.length > 0) {
        if (!mergedProfile.hobbies) mergedProfile.hobbies = [];
        mergedProfile.hobbies = [...mergedProfile.hobbies, ...transformedData.hobbies];
    }

    return mergedProfile;
}

async function updateUserProfile(userId: string, profileData: UserProfile) {
    const {error} = await updateEntireProfile(userId, profileData);
    if (error) {
        console.error('Error updating profile:', error);
        throw new Error('Failed to update profile');
    }

    revalidatePath('/profile');
}

export async function extractCvDataFromFile(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        return {...prevState, error: 'User not authenticated'};
    }

    try {
        // Get files from form data
        const images = formData.getAll('images') as File[];
        const file = images.length > 0 ? null : (formData.get('file') as File);
        const userProfile = await getUserProfile();

        if (!userProfile) {
            return {data: null, error: 'No user profile'};
        }

        if (!images.length && !file) {
            return {data: null, error: 'No files provided'};
        }

        // Define valid file types
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validDocumentTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'text/csv', // .csv
            'application/csv', // alternative CSV mime type
            'application/vnd.ms-excel', // .xls
        ];

        let extractedData: z.infer<typeof extractionSchema> | null = null;
        let updatedProfile: UserProfile = {...userProfile};

        // Process multiple images (from PDF or direct uploads)
        if (images.length > 0) {
            // Limit to 3 images for processing
            const processImages = images.slice(0, 3);

            if (images.length > 3) {
                console.warn('More than 3 images provided, using only the first 3');
            }

            // Check credits once before processing
            const hasCredits = await hasEnoughCredits(user.id, credits.extractProfileData);
            if (!hasCredits) return {error: 'Not enough credits!'};

            // Process the first image with userId to charge credits
            let firstImageProcessed = false;

            // Process each image
            for (let i = 0; i < processImages.length; i++) {
                const imageFile = processImages[i];

                if (!validImageTypes.includes(imageFile.type)) {
                    console.warn(`Skipping file with invalid type: ${imageFile.type}`);
                    continue;
                }

                if (imageFile.size > 4000000) {
                    console.warn(`Skipping file that is too large: ${imageFile.size} bytes`);
                    continue;
                }

                const {base64} = await getFileDetails(imageFile);
                const pageInfo =
                    processImages.length > 1
                        ? `Analyze this page of the CV/resume. This is page ${i + 1} of ${processImages.length}.`
                        : '';

                // Only pass userId on the first successful image to charge credits just once
                const userId = !firstImageProcessed ? user.id : '';
                const pageData = await extractDataFromImage(base64, userProfile, userId, pageInfo);

                // Mark first image as processed after successful extraction
                if (!firstImageProcessed && userId) {
                    firstImageProcessed = true;
                }

                if (shouldUpdateProfile(userProfile, pageData)) {
                    updatedProfile = mergeProfileData(updatedProfile, pageData);
                    // Save the last successfully processed data
                    extractedData = pageData;
                } else {
                    console.log('Names do not match, skipping update for this page');
                }
            }
        }
        // Process single file (image, DOCX, or CSV)
        else if (file) {
            // Check by file extension as fallback for CSV files
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            const isCSVByExtension = fileExtension === 'csv';
            const isDocumentType = validDocumentTypes.includes(file.type) || isCSVByExtension;

            // Handle DOCX and CSV files
            if (isDocumentType) {
                const maxSize = isCSVByExtension || file.type.includes('csv') ? 1000000 : 5000000; // 1MB for CSV, 5MB for DOCX
                const maxSizeLabel = isCSVByExtension || file.type.includes('csv') ? '1MB' : '5MB';

                if (file.size > maxSize) {
                    return {data: null, error: `File too large (max ${maxSizeLabel})`};
                }

                // Check credits before processing
                const hasCredits = await hasEnoughCredits(user.id, credits.extractProfileData);
                if (!hasCredits) return {error: 'Not enough credits!'};

                const documentText = await extractTextFromDocumentWithLangchain(file);
                extractedData = await extractDataFromDocument(documentText, userProfile, user.id);

                if (shouldUpdateProfile(userProfile, extractedData)) {
                    updatedProfile = mergeProfileData(userProfile, extractedData);
                } else {
                    return {
                        data: null,
                        error: 'The first and last name in the document do not match your profile. Please check and try again.',
                    };
                }
            }
            // Handle single image files
            else if (validImageTypes.includes(file.type)) {
                if (file.size > 4000000) {
                    return {data: null, error: 'File too large'};
                }

                // Check credits before processing
                const hasCredits = await hasEnoughCredits(user.id, credits.extractProfileData);
                if (!hasCredits) return {error: 'Not enough credits!'};

                const {base64} = await getFileDetails(file);
                extractedData = await extractDataFromImage(base64, userProfile, user.id);

                if (shouldUpdateProfile(userProfile, extractedData)) {
                    updatedProfile = mergeProfileData(userProfile, extractedData);
                } else {
                    return {
                        data: null,
                        error: 'The first and last name in the CV do not match your profile. Please check and try again.',
                    };
                }
            } else {
                return {data: null, error: 'Unsupported file type'};
            }
        }

        // Apply duplicate filtering and update profile if data was extracted
        if (extractedData) {
            const isEmpty = areAllArraySectionsEmpty(extractedData);
            const hasNonEmptyData = !isEmpty;

            // Filter duplicate entries if we have non-empty data
            if (hasNonEmptyData) {
                console.log('extracted Profile:', updatedProfile);
                const {filteredProfile, error} = await filterUniqueProfileData(updatedProfile);
                if (!error && filteredProfile) {
                    await updateUserProfile(user.id, filteredProfile);
                    revalidatePath('/profile');
                    return {data: filteredProfile, error: null};
                }
            }

            // If filtering failed or data was empty, use the merged profile
            await updateUserProfile(user.id, updatedProfile);
            revalidatePath('/profile');
            return {data: updatedProfile, error: null};
        }

        return {data: null, error: 'Failed to extract data from the provided file(s)'};
    } catch (error) {
        console.error('Error extracting CV data:', error);
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Failed to extract data from file',
        };
    }
}
