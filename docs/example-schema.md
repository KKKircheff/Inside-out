import {z} from 'zod';

const academicDisciplines = {
    'Humanities': {
        'label': 'Humanities',
        'fields': {
            'history': 'History',
            'literature': 'Literature',
            'philosophy': 'Philosophy',
            'religiousStudies': 'Religious Studies',
            'languages': 'Languages',
            'artHistory': 'Art History',
            'culturalStudies': 'Cultural Studies',
        },
    },
    'Social Sciences': {
        'label': 'Social Sciences',
        'fields': {
            'psychology': 'Psychology',
            'sociology': 'Sociology',
            'anthropology': 'Anthropology',
            'economics': 'Economics',
            'politicalScience': 'Political Science',
            'geography': 'Geography',
            'education': 'Education',
        },
    },
    'Natural Sciences': {
        'label': 'Natural Sciences',
        'fields': {
            'biology': 'Biology',
            'chemistry': 'Chemistry',
            'physics': 'Physics',
            'earthSciences': 'Earth Sciences',
            'astronomy': 'Astronomy',
            'environmentalScience': 'Environmental Science',
        },
    },
    'Engineering': {
        'label': 'Engineering',
        'fields': {
            'civilEngineering': 'Civil Engineering',
            'mechanicalEngineering': 'Mechanical Engineering',
            'electricalEngineering': 'Electrical Engineering',
            'computerEngineering': 'Computer Engineering',
            'chemicalEngineering': 'Chemical Engineering',
            'biomedicalEngineering': 'Biomedical Engineering',
        },
    },
    'Mathematics and Statistics': {
        'label': 'Mathematics and Statistics',
        'fields': {
            'mathematics': 'Mathematics',
            'statistics': 'Statistics',
            'appliedMathematics': 'Applied Mathematics',
            'actuarialScience': 'Actuarial Science',
            'operationsResearch': 'Operations Research',
        },
    },
    'Health Sciences': {
        'label': 'Health Sciences',
        'fields': {
            'medicine': 'Medicine',
            'nursing': 'Nursing',
            'publicHealth': 'Public Health',
            'pharmacy': 'Pharmacy',
            'dentistry': 'Dentistry',
            'physiotherapy': 'Physiotherapy',
        },
    },
    'Business and Management': {
        'label': 'Business and Management',
        'fields': {
            'businessAdministration': 'Business Administration',
            'management': 'Management',
            'marketing': 'Marketing',
            'finance': 'Finance',
            'accounting': 'Accounting',
            'entrepreneurship': 'Entrepreneurship',
        },
    },
    'Computer Science and Information Technology': {
        'label': 'Computer Science and Information Technology',
        'fields': {
            'computerScience': 'Computer Science',
            'informationTechnology': 'Information Technology',
            'dataScience': 'Data Science',
            'computerEngineering': 'Computer Engineering',
            'cybersecurity': 'Cybersecurity',
            'artificialIntelligence': 'Artificial Intelligence',
        },
    },
    'Fine Arts': {
        'label': 'Fine Arts',
        'fields': {
            'fineArts': 'Fine Arts',
            'music': 'Music',
            'theatre': 'Theatre',
            'dance': 'Dance',
            'filmStudies': 'Film Studies',
            'design': 'Design',
        },
    },
    'Law': {
        'label': 'Law',
        'fields': {
            'criminalLaw': 'Criminal Law',
            'civilLaw': 'Civil Law',
            'constitutionalLaw': 'Constitutional Law',
            'internationalLaw': 'International Law',
            'legalStudies': 'Legal Studies',
            'humanRightsLaw': 'Human Rights Law',
        },
    },
    'Other': {
        'label': 'Other',
        'fields': {
            'other': 'Please specify your field of study',
        },
    },
};

const disciplineCategories = Object.keys(academicDisciplines);

const allDisciplineFields = Object.values(academicDisciplines).flatMap((category) => Object.values(category.fields));

export function createExtractionSchema(existingSkillCategories: string[] = []) {
    const categoryDescription =
        existingSkillCategories.length > 0
            ? `First, check if skill categories are mentioned in the document (section headers, groupings). If categories are not presented in the document, suggest appropriate categories for each skill. User has these existing categories: ${existingSkillCategories.join(
                  ', '
              )}. Prefer these when applicable. Common category examples include: "Frontend", "Backend", "Database", "DevOps", "Management", "Design", "Programming Languages", "Cloud Services", "AI/ML", "Mobile Development", "Testing", "Analytics", "Soft Skills", "Other". Use the most specific and relevant category for each skill.`
            : `First, check if skill categories are mentioned in the document (section headers, groupings). If categories are not presented in the document, categorize skill into one of these groups: "Frontend", "Backend", "Database", "DevOps", "Management", "Design", "Language", "Framework", "Tool", "Soft Skill", or "Other". Infer category from context if not explicitly stated.`;

    return z.object({
        general: z.object({
            firstName: z
                .string()
                .describe(
                    'Extract first name from document header or contact section. If only a full name is provided, split it and extract the first part.'
                ),
            lastName: z
                .string()
                .describe(
                    'Extract last name from document header or contact section. If only a full name is provided, split it and extract the second part. For names with more than two parts, combine all parts after the first as the last name.'
                ),
            email: z
                .string()
                .describe(
                    'Extract primary email address from contact information. Verify it follows standard email format with @ symbol and domain.'
                ),
            phoneNumber: z
                .string()
                .describe(
                    'Extract formatted phone number from contact information. Standardize format when possible (e.g., +1-XXX-XXX-XXXX for US numbers).'
                ),
            city: z
                .string()
                .describe(
                    'Extract city name from address/location information. If only country is mentioned, try to infer the city from work history or education.'
                ),
            country: z
                .string()
                .describe(
                    'Extract country name from address/location information. If only city is mentioned, infer the country based on the city if possible.'
                ),
            postCode: z
                .string()
                .describe(
                    'Extract postal/zip code from address information. Ensure it matches the standard format for the country if identifiable.'
                ),
            qualificationTitle: z
                .string()
                .describe(
                    'Extract professional headline or job title typically shown near the name. If no explicit title is provided, infer from most recent role in career history.'
                ),
        }),
        summary: z
            .object({
                summary: z
                    .string()
                    .describe(
                        'Extract professional profile or summary statement as a complete paragraph. If no explicit summary section exists, generate a brief one based on career history and skills.'
                    ),
            })
            .describe('Extract professional summary section typically found at top of resume.'),
        careerHistory: z.array(
            z.object({
                jobTitle: z
                    .string()
                    .describe(
                        'Extract position title for each work experience entry. If multiple titles at same company, list the most senior one.'
                    ),
                employer: z
                    .string()
                    .describe(
                        'Extract company/organization name for each position. If abbreviations are used, expand to full name if recognizable (e.g., "IBM" to "International Business Machines").'
                    ),
                location: z
                    .string()
                    .describe(
                        'Extract job location (city/country) if provided. If location is not specified but can be reasonably inferred from company name or other context, provide that location. Otherwise use "---".'
                    ),
                startDate: z
                    .string()
                    .nullable()
                    .describe('Extract start date in ISO format (YYYY-MM-DD) or parse from text format.'),
                endDate: z
                    .string()
                    .nullable()
                    .describe('Extract end date in ISO format (YYYY-MM-DD) or use null if "Present" or "Current".'),
                description: z
                    .string()
                    .describe(
                        'Extract complete job responsibilities and achievements as a cohesive paragraph. If bullet points are provided, combine them into a flowing narrative. Include metrics and quantifiable achievements when present. At least 3 characters long or let default description.'
                    ),
            })
        ),
        skills: z.array(
            z.object({
                skill: z
                    .string()
                    .describe(
                        'Extract specific skill name as written (e.g., "React", "Project Management"). Standardize common variations where appropriate (e.g., "JS" to "JavaScript", "ML" to "Machine Learning").'
                    ),
                category: z.string().describe(categoryDescription),
                level: z
                    .number()
                    .nullable()
                    .describe(
                        'Convert skill proficiency to 1-5 scale (5=expert) based on context or stated level. Look for indicators like "Expert in", "Proficient with", years of experience, or visual indicators (bars/stars) to determine level. If no level is indicated, infer from context in career history or projects.'
                    ),
            })
        ),
        certifications: z.array(
            z.object({
                certificationName: z
                    .string()
                    .describe(
                        'Extract full certification title as written. For well-known certifications with abbreviations, include both full name and abbreviation (e.g., "AWS Certified Solutions Architect (CSA)").'
                    ),
                issuingOrganization: z
                    .string()
                    .describe(
                        'Extract issuing authority or certifying body name. If not explicitly stated but can be inferred from certification name (e.g., "AWS Certification"), extract the organization (e.g., "Amazon Web Services").'
                    ),
                date: z
                    .string()
                    .nullable()
                    .describe(
                        'Extract certification date in ISO format (YYYY-MM-DD). If only expiration date is provided, extract that and note "Expiration:" prefix. If only month and year are provided, use the 1st day of the month.'
                    ),
            })
        ),
        languages: z.array(
            z.object({
                language: z.string().describe('Extract language name (e.g., "English", "Spanish").'),
                level: z.object({
                    optionKey: z
                        .enum(['beginner', 'elementary', 'intermediate', 'advanced', 'proficient', 'native'])
                        .describe(
                            'Map language proficiency to EXACTLY ONE of these values: ["beginner", "elementary", "intermediate", "advanced", "proficient",  "native"]. Alays map to the closest match from the specified options.'
                        ),
                    optionValue: z.string().describe('Use the exact same value as optionKey (must be identical).'),
                }),
            })
        ),
        education: z
            .array(
                z.object({
                    schoolName: z
                        .string()
                        .describe(
                            'Extract institution name as written. For well-known institutions with abbreviations, include both (e.g., "Massachusetts Institute of Technology (MIT)").'
                        ),
                    schoolLocation: z
                        .string()
                        .describe(
                            'Extract school location (city/country) if provided. If not provided but institution is well-known, fill in that location (e.g., "Harvard University" in "Cambridge, MA, USA"). Otherwise use "---".'
                        ),
                    degree: z
                        .string()
                        .describe(
                            'Extract degree type and field (e.g., "Bachelor of Science"). Standardize common abbreviations (e.g., "BS" to "Bachelor of Science", "MBA" to "Master of Business Administration"). Include honors if mentioned (e.g., "cum laude").'
                        ),
                    fieldOfStudy: z.object({
                        groupTitle: z
                            .string()
                            .describe(
                                `Extract broad academic category from these options: ${disciplineCategories.join(', ')}`
                            ),
                        groupTitleTranslated: z
                            .string()
                            .describe(
                                'Use same value as groupTitle if in English. If not in English, translate to English.'
                            ),
                        value: z
                            .string()
                            .describe(
                                `Extract specific field of study. Common fields include: ${allDisciplineFields
                                    .slice(0, 10)
                                    .join(
                                        ', '
                                    )}, etc. If not explicitly stated but degree contains field (e.g., "Bachelor of Science in Computer Science"), extract that field.`
                            ),
                        valueTranslated: z
                            .string()
                            .describe(
                                'Use same value as value if in English. If not in English, translate to English.'
                            ),
                    }),
                    startDate: z
                        .string()
                        .nullable()
                        .describe('Extract education start date in ISO format (YYYY-MM-DD) or null if not found.'),
                    graduationDate: z
                        .string()
                        .nullable()
                        .describe('Extract graduation date in ISO format (YYYY-MM-DD) or null if not found.'),
                    description: z
                        .string()
                        .describe(
                            'Extract relevant courses, thesis details, academic achievements, or extracurricular activities. Include GPA if provided. For thesis or major projects, include title and brief description. Format using HTML tags for enhanced readability: <p>, <strong>, <em>, <ul>, <li>. At least 3 characters long or let default description.'
                        ),
                })
            )
            .describe('Educations that user went through or still studing'),
        projects: z.array(
            z.object({
                projectName: z
                    .string()
                    .describe(
                        'Extract project title as written in portfolio/project section. If project lacks a formal name but has a clear purpose, use a descriptive title (e.g., "Company Website Redesign").'
                    ),
                role: z
                    .string()
                    .describe(
                        'Extract role in project if specified. If not explicitly stated but can be inferred from project description or context, provide the most likely role (e.g., "Lead Developer" for someone who "led development team of 5").'
                    ),
                description: z
                    .string()
                    .describe(
                        'Extract project details including technologies, methodologies, and outcomes. Include quantifiable metrics where available. If only technologies are listed without context, elaborate on their likely application in the project. At least 3 characters long or let default description.'
                    ),
                startDate: z
                    .string()
                    .nullable()
                    .describe('Extract project start date in ISO format (YYYY-MM-DD) or use null if not found.'),
                endDate: z
                    .string()
                    .nullable()
                    .describe('Extract project end date in ISO format (YYYY-MM-DD) or use null if not found.'),
                link: z
                    .string()
                    .describe(
                        'Extract URL or repository link for project if provided. Ensure URLs include proper protocol (add "https://" if missing).'
                    ),
            })
        ),
        publications: z.array(
            z.object({
                title: z
                    .string()
                    .describe(
                        'Extract publication title exactly as written. Maintain proper capitalization and formatting. For academic papers, include full title with subtitle if available.'
                    ),
                publisher: z
                    .string()
                    .describe(
                        'Extract journal name, website, or publishing platform. If only abbreviated journal name is provided (e.g., "IEEE Trans."), expand to full name if recognizable (e.g., "IEEE Transactions").'
                    ),
                date: z
                    .string()
                    .nullable()
                    .describe('Extract publication date in ISO format (YYYY-MM-DD) or null if not found.'),
                description: z
                    .string()
                    .describe(
                        'Extract publication abstract or description. For academic papers, include research focus and key findings if available. If co-authored, mention collaboration. At least 3 characters long or let default description.'
                    ),
                link: z
                    .string()
                    .describe(
                        'Extract DOI, URL, or other publication identifier. For DOIs, format as full URL (e.g., "https://doi.org/10.xxxx/xxxxx"). For web links, ensure proper protocol (add "https://" if missing).'
                    ),
            })
        ),
        webLinks: z.array(
            z.object({
                title: z
                    .string()
                    .describe(
                        'Extract media type (e.g., "LinkedIn", "GitHub", "Portfolio"). For generic URLs, attempt to identify the platform (e.g., a "github.com" URL should have title "GitHub"). If platform is unrecognizable, use "Website" or "Personal Site" as appropriate.'
                    ),
                url: z
                    .string()
                    .describe(
                        'Extract complete URL with protocol prefix (e.g., "https://linkedin.com/in/username"). Always include "https://" for any web address that lacks a protocol. For shortened usernames (e.g., "@username"), expand to full URL for the likely platform.'
                    ),
            })
        ),
        volunteerExperiences: z.array(
            z.object({
                organizationName: z
                    .string()
                    .describe(
                        'Extract volunteer organization name. If abbreviation is used, expand to full name if recognizable (e.g., "WWF" to "World Wildlife Fund").'
                    ),
                role: z
                    .string()
                    .describe(
                        'Extract volunteer position title. If no specific title is provided but responsibilities are described, infer an appropriate title (e.g., "Mentor" for someone who "mentored students").'
                    ),
                startDate: z
                    .string()
                    .nullable()
                    .describe('Extract volunteer start date in ISO format (YYYY-MM-DD) or null if not found.'),
                endDate: z
                    .string()
                    .nullable()
                    .describe('Extract volunteer end date in ISO format (YYYY-MM-DD) or null if not found.'),
                description: z
                    .string()
                    .describe(
                        'Extract volunteer responsibilities and achievements. Include impact metrics when available (e.g., "helped 50+ families"). If bullet points are provided, combine into a coherent paragraph. At least 3 characters long or let default description.'
                    ),
            })
        ),
        awards: z.array(
            z.object({
                title: z
                    .string()
                    .describe(
                        'Extract award name or honor received. Include any ranking or distinction level (e.g., "First Place", "Honorable Mention").'
                    ),
                awarder: z
                    .string()
                    .describe(
                        'Extract organization that granted the award. If abbreviation is used, expand to full name if recognizable. If award is from employer or school already mentioned elsewhere, use that full name.'
                    ),
                date: z
                    .string()
                    .nullable()
                    .describe('Extract award date in ISO format (YYYY-MM-DD) or null if not found.'),
                description: z
                    .string()
                    .describe(
                        'Extract award significance, criteria, or context. Include information about competition size or exclusivity if available (e.g., "Selected from 500+ applicants"). At least 3 characters long or let default description.'
                    ),
            })
        ),
        publicEngagments: z.array(
            z.object({
                title: z
                    .string()
                    .describe(
                        'Extract engagement title (speaking event, panel, etc.). Include specific presentation title if available (e.g., "Keynote: The Future of AI").'
                    ),
                organization: z
                    .string()
                    .describe(
                        'Extract hosting venue or organization. If conference or event name is provided instead of organization, use that (e.g., "TechCon 2023").'
                    ),
                startDate: z
                    .string()
                    .nullable()
                    .describe('Extract event date in ISO format (YYYY-MM-DD) or null if not found.'),
                endDate: z
                    .string()
                    .nullable()
                    .describe('Extract end date for multi-day events in ISO format (YYYY-MM-DD) or null if not found.'),
                description: z
                    .string()
                    .describe(
                        'Extract topic and role description for the engagement. Include audience size, impact, or feedback if available. For panel discussions, note if moderator or panelist. At least 3 characters long or let default description.'
                    ),
            })
        ),
        proMemberships: z.array(
            z.object({
                organizationName: z
                    .string()
                    .describe(
                        'Extract professional association or organization name. For well-known organizations with acronyms, include both (e.g., "Project Management Institute (PMI)").'
                    ),
                membershipType: z
                    .string()
                    .describe(
                        'Extract membership level if specified (e.g., "Fellow", "Associate", "Senior Member"). If not specified but role is described (e.g., "Board Member"), use that instead of the default.'
                    ),
                startDate: z
                    .string()
                    .nullable()
                    .describe('Extract membership start date in ISO format (YYYY-MM-DD) or null if not found.'),
                endDate: z
                    .string()
                    .nullable()
                    .describe('Extract membership end date in ISO format (YYYY-MM-DD) or null if not found.'),
                description: z
                    .string()
                    .describe(
                        'Extract membership details, activities, or responsibilities. If position held within organization (e.g., committee chair), include that information. At least 3 characters long or let default description.'
                    ),
            })
        ),
        references: z.array(
            z.object({
                name: z
                    .string()
                    .describe(
                        "Extract reference person's full name. Use proper capitalization and include titles like Dr., Prof. if provided."
                    ),
                relationship: z
                    .string()
                    .describe(
                        'Extract professional relationship (e.g., "Manager", "Supervisor"). If relationship includes company name, include it (e.g., "Manager at ABC Corp"). If not explicitly stated but position is given, infer relationship (e.g., "CEO at previous company" becomes "Former CEO").'
                    ),
                contactInformation: z
                    .string()
                    .describe(
                        'Extract reference contact details (email/phone). Format phone numbers consistently. For emails, ensure proper format with @ symbol. If statement like "Available upon request" appears, use that instead of default.'
                    ),
            })
        ),
        hobbies: z.array(
            z.object({
                hobby: z
                    .string()
                    .describe(
                        'Extract hobby name or interest area. Group related activities when appropriate (e.g., "Running, Swimming" could be "Endurance Sports").'
                    ),
                description: z
                    .string()
                    .describe(
                        'Extract additional context about the hobby if provided. Include achievements or frequency of participation if mentioned (e.g., "Marathon runner with 5 completed races"). If not explicitly described but context exists elsewhere in document, incorporate relevant details. At least 3 characters long or let default description.'
                    ),
            })
        ),
    });
}

export const extractionSchema = createExtractionSchema();
