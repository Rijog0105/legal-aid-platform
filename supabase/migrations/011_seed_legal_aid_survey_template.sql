-- ================================================================
-- Migration 011: Seed Legal Aid Survey Template
-- ================================================================

DO $$
DECLARE
  v_template_id UUID;
  v_sec_preliminary UUID;
  v_sec_family_roster UUID;
  v_sec_general_questions UUID;
  v_sec_doc_survey UUID;
  v_sec_education_employment UUID;
  v_sec_amenities_property UUID;
  v_sec_verification UUID;
  v_faculty_user_id UUID;
BEGIN
  -- 1. Try to find a user to associate as creator (default to NULL if none exists)
  SELECT id INTO v_faculty_user_id FROM public.users LIMIT 1;

  -- 2. Insert or get Template (Ensure idempotency by checking title and version)
  INSERT INTO public.survey_templates (title, description, version, is_active, created_by)
  VALUES (
    'School of Law Legal Awareness Survey',
    'Official household legal-awareness questionnaire by the School of Law.',
    1,
    true,
    v_faculty_user_id
  )
  ON CONFLICT (title, version) DO UPDATE 
  SET description = EXCLUDED.description, is_active = EXCLUDED.is_active
  RETURNING id INTO v_template_id;

  -- 3. Clear existing template metadata details to prevent duplicates on manual re-run
  DELETE FROM public.survey_sections WHERE template_id = v_template_id;

  -- 4. Insert Sections
  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'Preliminary Data Collection Details', 'Village/District, Data Collector and Family Address details.', 0)
  RETURNING id INTO v_sec_preliminary;

  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'Family Members Details', 'Name, Age, and Gender roster of all family members.', 1)
  RETURNING id INTO v_sec_family_roster;

  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'General Socio-Economic & Legal Aid Questions (Q1 - Q8)', 'Occupation, Housing, Free Legal Aid Eligibility, Vehicle & Litigation.', 2)
  RETURNING id INTO v_sec_general_questions;

  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'Survey Regarding Non-Availability of Necessary Documents', 'Availability and applications for essential documents and welfare cards.', 3)
  RETURNING id INTO v_sec_doc_survey;

  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'Education, Employment & Vulnerability Status (Q9 - Q18)', 'Education levels, unemployment reasons, and legal vulnerability metrics.', 4)
  RETURNING id INTO v_sec_education_employment;

  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'Basic Amenities, Property Documents & Other Problems (Q19 - Q21)', 'Basic infrastructure, land/house RTC Khata documents and other legal issues.', 5)
  RETURNING id INTO v_sec_amenities_property;

  INSERT INTO public.survey_sections (template_id, title, description, display_order)
  VALUES (v_template_id, 'Proof of Survey & Photo Verification', 'Upload mandatory photo proof of survey conducted on site.', 6)
  RETURNING id INTO v_sec_verification;

  -- 5. Insert Questions for Preliminary Section
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_preliminary, 'Village / District (ಗ್ರಾಮ / ಜಿಲ್ಲೆ)', 'villageDistrict', 'text', true, '[]'::jsonb, 0),
    (v_sec_preliminary, 'Date of Data collection (ಸಮೀಕ್ಷೆಯ ದಿನಾಂಕ)', 'dateOfDataCollection', 'date', true, '[]'::jsonb, 1),
    (v_sec_preliminary, 'Name of the Data Collector (ಸಮೀಕ್ಷೆಕಾರರ ಹೆಸರು)', 'nameOfDataCollector', 'text', true, '[]'::jsonb, 2),
    (v_sec_preliminary, 'Name of Organization / College (ಸಂಸ್ಥೆ / ಕಾಲೇಜಿನ ಹೆಸರು)', 'nameOfOrganizationCollege', 'text', true, '[]'::jsonb, 3),
    (v_sec_preliminary, 'Address of the family whose data is collected (ಕುಟುಂಬ ವಿವರ ಮತ್ತು ವಿಳಾಸ)', 'addressOfFamily', 'textarea', true, '[]'::jsonb, 4);

  -- 6. Insert Family Members Roster
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_family_roster, 'Family Members Roster (Sl. No, Name, Age, Gender)', 'familyMembers', 'family_grid', false, '[]'::jsonb, 0);

  -- 7. Insert General Questions (Q1 to Q8)
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '1. Total number of earning persons and dependent member in the house ? (ಕುಟುಂಬದಲ್ಲಿ ದುಡಿಯುವ ವ್ಯಕ್ತಿಗಳ ಸಂಖ್ಯೆ ಮತ್ತು ಅವಲಂಬಿತರ ಸಂಖ್ಯೆ)', 'q1TotalEarningAndDependents', 'text', true, '[]'::jsonb, 0);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '2. Main occupation of your family', 'q2MainOccupation', 'radio', true, 
     '[
       {"label": "a) Agriculture (ವ್ಯವಸಾಯ)", "value": "Agriculture"},
       {"label": "b) House Wife (ಗೃಹಿಣಿ)", "value": "House Wife"},
       {"label": "c) Self Employed (ಸ್ವಯಂ ಉದ್ಯೋಗಿ)", "value": "Self Employed"},
       {"label": "d) Cooly (ಕೂಲಿ)", "value": "Cooly"},
       {"label": "e) Government Employee (ಸರ್ಕಾರಿ ನೌಕರ)", "value": "Government Employee"},
       {"label": "f) Private Employee (ಖಾಸಗಿ ನೌಕರ)", "value": "Private Employee"},
       {"label": "g) Other (ಇತರೆ)", "value": "Other"}
     ]'::jsonb, 1);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '3. Which type of house you have ? (ಯಾವ ವಿಧದ ಮನೆಯನ್ನು ಹೊಂದಿದ್ದೀರಾ?)', 'q3HouseType', 'radio', true, 
     '[
       {"label": "a) Kaccha House (ಕಚ್ಚಾ ಮನೆ)", "value": "Kaccha House"},
       {"label": "b) Pucca House (ಪಕ್ಕಾ ಮನೆ)", "value": "Pucca House"},
       {"label": "c) Semi Pucca House (ಅರೆ ಪಕ್ಕಾ ಮನೆ)", "value": "Semi Pucca House"},
       {"label": "d) Other (ಇತರೆ)", "value": "Other"}
     ]'::jsonb, 2);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '4. Ownership of the House (ಮನೆಯ ಮಾಲೀಕತ್ವ)', 'q4HouseOwnership', 'radio', true, 
     '[
       {"label": "a) Owned (ಸ್ವಂತ)", "value": "Owned"},
       {"label": "b) Rent (ಬಾಡಿಗೆ)", "value": "Rent"},
       {"label": "c) Lease (ಭೋಗ್ಯ)", "value": "Lease"}
     ]'::jsonb, 3);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '5. Do they fall into any of the following category to avail free legal aid (ಉಚಿತ ಕಾನೂನು ನೆರವು ಪಡೆಯಲು ಈ ಕೆಳಗಂಡ ಯಾವುದಾದರೂ ವರ್ಗಕ್ಕೆ ಸೇರಿರುತ್ತಾರೆಯೇ?)', 'q5FreeLegalAidCategory', 'checkbox', false, 
     '[
       {"label": "(a) A member of a Scheduled Caste or Scheduled Tribe (ಪ.ಜಾತಿ / ಪ.ಪಂಗಡದವರೇ)", "value": "SC/ST"},
       {"label": "(b) A Women or a Child (ಮಹಿಳೆ ಅಥವಾ ಮಗು)", "value": "Women/Child"},
       {"label": "(c) A mentally ill or otherwise disabled person (ಮಾನಸಿಕ ಅಸ್ವಸ್ಥ ಅಥವಾ ಇತರ ಅಂಗವೈಕಲ್ಯ ವ್ಯಕ್ತಿ)", "value": "Disabled/Mentally Ill"},
       {"label": "(d) An industrial workman (ಕೈಗಾರಿಕಾ ಕೆಲಸಗಾರ)", "value": "Industrial Workman"},
       {"label": "(e) A victim of human trafficking (ಮಾನವ ಕಳ್ಳಸಾಗಾಣಿಕೆಗೆ ಒಳಗಾದ ಸಂತ್ರಸ್ತರು)", "value": "Human Trafficking Victim"},
       {"label": "(f) A victim mass disaster (ಮತೀಯ ದೌರ್ಜನ್ಯಕ್ಕೆ ಒಳಗಾದ ಸಂತ್ರಸ್ತರು)", "value": "Mass Disaster Victim"},
       {"label": "(g) Person in custody (ಸರೆವಾಸಿ)", "value": "Person in Custody"},
       {"label": "(h) Annual income below three lakh (ವಾರ್ಷಿಕ ಆದಾಯ ಮೂರು ಲಕ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ)", "value": "Income Below 3 Lakhs"}
     ]'::jsonb, 4);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '6. Do you have a vehicle, if yes do you have a valid : (ನೀವು ವಾಹನವನ್ನು ಹೊಂದಿದ್ದೀರಾ, ಹೌದು ಎಂದಾದರೆ ಈ ಕೆಳಗಿನ ಪರವಾನಗಿಯನ್ನು ಹೊಂದಿದ್ದೀರಾ?)', 'q6HasVehicle', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 5);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '7. Is there any pending litigation your family is involved in? if yes, for how long? (ಕುಟುಂಬಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಯಾವುದೇ ಪ್ರಕರಣ ನ್ಯಾಯಾಲಯದಲ್ಲಿ ಬಾಕಿ ಇದೆಯೇ? ಹೌದಾದರೆ, ಎಷ್ಟು ವರ್ಷಗಳಿಂದ ಬಾಕಿ ಇದೆ)', 'q7PendingLitigation', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 6);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_general_questions, 'If yes, for how long? (ಎಷ್ಟು ವರ್ಷಗಳಿಂದ ಬಾಕಿ ಇದೆ)', 'q7PendingLitigationDuration', 'text', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q7PendingLitigation", "showIfValue": "Yes"}'::jsonb, 7);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_general_questions, '8. Do you have membership of any organization? (ನೀವು ಯಾವುದಾದರೂ ಸಂಸ್ಥೆಯ ಸದಸ್ಯತ್ವ ಹೊಂದಿದ್ದೀರಾ)', 'q8MembershipOrganization', 'radio', true, 
     '[
       {"label": "a) Yes [ ಹೌದು ]", "value": "Yes"},
       {"label": "b) No [ ಇಲ್ಲ ]", "value": "No"}
     ]'::jsonb, 8);

  -- 8. Insert Documents Survey Questions
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, display_order)
  VALUES 
    (v_sec_doc_survey, '1. Ration Card (ಪಡಿತರ ಚೀಟಿ) - Whether family has a ration Card ? (ಕುಟುಂಬವು ಪಡಿತರ ಚೀಟಿಯನ್ನು ಹೊಂದಿದೆಯೇ?)', 'doc1RationCard', 'document_survey', false, 0),
    (v_sec_doc_survey, '2. Aadhar Card (ಆಧಾರ್ ಕಾರ್ಡ್) - Whether all family have Aadhar Card ? (ಕುಟುಂಬದ ಎಲ್ಲಾ ಸದಸ್ಯರು ಆಧಾರ್ ಕಾರ್ಡ್‌ನ್ನು ಹೊಂದಿದ್ದಾರೆಯೇ?)', 'doc2AadharCard', 'document_survey', false, 1),
    (v_sec_doc_survey, '3. Birth Certificate (ಜನನ ಪ್ರಮಾಣ ಪತ್ರ) - Whether all family have Birth Certificate ? (ಕುಟುಂಬದ ಎಲ್ಲಾ ಸದಸ್ಯರು ಜನನ ಪ್ರಮಾಣಪತ್ರವನ್ನು ಹೊಂದಿದ್ದಾರೆಯೇ?)', 'doc3BirthCertificate', 'document_survey', false, 2),
    (v_sec_doc_survey, '4. Death Certificate (ಮರಣ ಪ್ರಮಾಣ ಪತ್ರ) - Whether the death certificate of any deceased member is not obtained (ಮೃತ ಹೊಂದಿದ ಯಾವುದೇ ಕುಟುಂಬ ಸದಸ್ಯನ ಮರಣ ಪ್ರಮಾಣಪತ್ರವನ್ನು ಪಡೆಯಲಾಗಿದೆಯೇ?)', 'doc4DeathCertificate', 'document_survey', false, 3),
    (v_sec_doc_survey, '5. Old Age pension (ವೃದ್ಧಾಪ್ಯ ವೇತನ) - Whether old age pension is received by all the deserving senior citizens in the family. (ಅರ್ಹ ಹಿರಿಯ ನಾಗರಿಕರು ವೃದ್ಧಾಪ್ಯ ವೇತನವನ್ನು ಪಡೆಯುತ್ತಿದ್ದಾರೆಯೇ?)', 'doc5OldAgePension', 'document_survey', false, 4),
    (v_sec_doc_survey, '6. Widow pension (ವಿಧವಾ ವೇತನ) - Whether widow pension is received by all the deserving widows in the family. (ಕುಟುಂಬದ ಅರ್ಹ ವಿಧವಾ ಸದಸ್ಯರು ವಿಧವಾ ವೇತನವನ್ನು ಪಡೆಯುತ್ತಿದ್ದಾರೆಯೇ?)', 'doc6WidowPension', 'document_survey', false, 5),
    (v_sec_doc_survey, '7. Unique disability identify Card (ವಿಶಿಷ್ಟ ಅಂಗವೈಕಲ್ಯ ಗುರುತಿಸುವ ಕಾರ್ಡ್) - Whether UDID Cards are obtained by the disabled person in the family. (ಕುಟುಂಬದ ವಿಶಿಷ್ಟ ಅಂಗವೈಕಲ್ಯ ಹೊಂದಿದ ಸದಸ್ಯರು UDID ಕಾರ್ಡನ್ನು ಪಡೆದಿದ್ದಾರೆಯೇ?)', 'doc7UdidDisabilityCard', 'document_survey', false, 6),
    (v_sec_doc_survey, '8. Ayushman Bharat Health Account Card (ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಆರೋಗ್ಯ ಖಾತೆ ಕಾರ್ಡ್) - Whether Ayushman Bharat Health Account Card are obtained by the family. (ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಆರೋಗ್ಯ ಖಾತೆ ಕಾರ್ಡನ್ನು ಹೊಂದಿದ್ದಾರೆಯೇ?)', 'doc8AyushmanHealthCard', 'document_survey', false, 7);

  -- 9. Insert Education & Vulnerability Questions (Q9 to Q18)
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '9. Education Qualification : (ವಿದ್ಯಾಹರ್ತತೆ)', 'q9EducationQualification', 'select', true, 
     '[
       {"label": "Below Class 10 (10 ನೇ ತರಗತಿ ಕೆಳಗೆ)", "value": "Below Class 10"},
       {"label": "Class 10 (10 ನೇ ತರಗತಿ)", "value": "Class 10"},
       {"label": "Class 12/2nd PUC (12ನೇ ತರಗತಿ/2ನೇ ಪಿ.ಯು.ಸಿ.)", "value": "Class 12/2nd PUC"},
       {"label": "Under graduation/Post Graduation (ಪದವಿ/ಸ್ನಾತಕೋತ್ತರ ಪದವಿ)", "value": "UG/PG"},
       {"label": "Any other (please specify) (ಇತರೆ)", "value": "Other"}
     ]'::jsonb, 0);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '10. Any one discontinued Education? If yes, specify reason ? (ಶಿಕ್ಷಣದಿಂದ ಯಾರಾದರೂ ವಂಚಿತರಾಗಿದ್ದಾರೆಯೇ? ಹೌದಾದಲ್ಲಿ, ಕಾರಣ ತಿಳಿಸಿ?)', 'q10DiscontinuedEducation', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 1);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, specify reason (ಕಾರಣ ತಿಳಿಸಿ)', 'q10DiscontinuedReason', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q10DiscontinuedEducation", "showIfValue": "Yes"}'::jsonb, 2);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '11. Nature of employment in the family. If unemployed give details. (ಕುಟುಂಬದ ಉದ್ಯೋಗದ ಸ್ವರೂಪ. ನಿರುದ್ಯೋಗಿಯಾಗಿದ್ದಲ್ಲಿ ಕಾರಣ ತಿಳಿಸಿ.)', 'q11NatureOfEmployment', 'select', true, 
     '[
       {"label": "Agriculturist (ಕೃಷಿಕ)", "value": "Agriculturist"},
       {"label": "House Wife (ಗೃಹಿಣಿ)", "value": "House Wife"},
       {"label": "Self Employed (ಸ್ವ ಉದ್ಯೋಗಿ)", "value": "Self Employed"},
       {"label": "Government Employee (ಸರ್ಕಾರಿ ನೌಕರ)", "value": "Government Employee"},
       {"label": "Private Employee (ಖಾಸಗಿ ಕಂಪನಿ ನೌಕರ)", "value": "Private Employee"},
       {"label": "Other (ಇತರೆ)", "value": "Other"}
     ]'::jsonb, 3);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '12. Is there any transgender in the family. (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ತೃತೀಯ ಲಿಂಗ ವ್ಯಕ್ತಿ ಇದ್ದಾರೆಯೇ?)', 'q12TransgenderInFamily', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 4);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q12TransgenderDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q12TransgenderInFamily", "showIfValue": "Yes"}'::jsonb, 5);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '13. Is there any person in the family who is victim of child marriage? (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಬಾಲ್ಯ ವಿವಾಹ ಸಂತ್ರಸ್ತರು ಇದ್ದಾರೆಯೇ ?)', 'q13VictimOfChildMarriage', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 6);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q13ChildMarriageDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q13VictimOfChildMarriage", "showIfValue": "Yes"}'::jsonb, 7);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '14. Is there any person in the family who is affected with HIV/incurable disease? (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಹೆಚ್.ಐ.ವಿ/ವಾಶಿಯಾಗದ ಖಾಯಿಲೆಯಿಂದ ಬಳಲುತ್ತಿದ್ದಾರೆಯೇ?)', 'q14AffectedHivIncurableDisease', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 8);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q14HivDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q14AffectedHivIncurableDisease", "showIfValue": "Yes"}'::jsonb, 9);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '15. Is there any person in the family who is victim of child labour? (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಬಾಲ ಕಾರ್ಮಿಕ ಸಂತ್ರಸ್ತರು ಇದ್ದಾರೆಯೇ ?)', 'q15VictimOfChildLabour', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 10);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q15ChildLabourDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q15VictimOfChildLabour", "showIfValue": "Yes"}'::jsonb, 11);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '16. Is there any person in the family who is victim of bonded labour? (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಜೀತ ಕಾರ್ಮಿಕ ಸಂತ್ರಸ್ತರು ಇದ್ದಾರೆಯೇ ?)', 'q16VictimOfBondedLabour', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 12);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q16BondedLabourDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q16VictimOfBondedLabour", "showIfValue": "Yes"}'::jsonb, 13);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '17. Is there any person in the family who is victim of Devadasi System ? (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ದೇವದಾಸಿ ಸಂತ್ರಸ್ತರು ಇದ್ದಾರೆಯೇ ?)', 'q17VictimOfDevadasiSystem', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 14);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q17DevadasiDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q17VictimOfDevadasiSystem", "showIfValue": "Yes"}'::jsonb, 15);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_education_employment, '18. Is there any person with mental disability or intellectual disability in the family ? (ಕುಟುಂಬದಲ್ಲಿ ಯಾರಾದರೂ ಮಾನಸಿಕ ಖಾಯಿಲೆ/ ಬೌದ್ಧಿಕ ಅಸಾಮರ್ಥ್ಯ ರು ಇದ್ದಾರೆಯೇ ?)', 'q18MentalOrIntellectualDisability', 'radio', true, 
     '[
       {"label": "Yes (ಹೌದು)", "value": "Yes"},
       {"label": "No (ಇಲ್ಲ)", "value": "No"}
     ]'::jsonb, 16);

  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, conditional_logic, display_order)
  VALUES 
    (v_sec_education_employment, 'If yes, provide details. (ಹೌದಾದಲ್ಲಿ, ವಿವರ ನೀಡುವುದು.)', 'q18DisabilityDetails', 'textarea', true, '[]'::jsonb, 
     '{"dependsOnQuestionId": "q18MentalOrIntellectualDisability", "showIfValue": "Yes"}'::jsonb, 17);

  -- 10. Insert Basic Amenities & Property Questions (Q19 to Q21)
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_amenities_property, '19. Availability of Basic Amenities - a) Water (ಮೂಲಭೂತ ಸೌಕರ್ಯಗಳ ವ್ಯವಸ್ಥೆ - ನೀರು)', 'q19aWater', 'radio', true, '[{"label": "Yes (ಹೌದು)", "value": "Yes"}, {"label": "No (ಇಲ್ಲ)", "value": "No"}]'::jsonb, 0),
    (v_sec_amenities_property, '19. Availability of Basic Amenities - b) Electricity (ವಿದ್ಯುಚ್ಛಕ್ತಿ)', 'q19bElectricity', 'radio', true, '[{"label": "Yes (ಹೌದು)", "value": "Yes"}, {"label": "No (ಇಲ್ಲ)", "value": "No"}]'::jsonb, 1),
    (v_sec_amenities_property, '19. Availability of Basic Amenities - c) Roads/Pathways (ರಸ್ತೆ/ದಾರಿ)', 'q19cRoadsPathways', 'radio', true, '[{"label": "Yes (ಹೌದು)", "value": "Yes"}, {"label": "No (ಇಲ್ಲ)", "value": "No"}]'::jsonb, 2),
    (v_sec_amenities_property, '19. Availability of Basic Amenities - d) Health Facilities (ಆರೋಗ್ಯ ಸೌಲಭ್ಯ)', 'q19dHealthFacilities', 'radio', true, '[{"label": "Yes (ಹೌದು)", "value": "Yes"}, {"label": "No (ಇಲ್ಲ)", "value": "No"}]'::jsonb, 3),
    (v_sec_amenities_property, '20. Is property documents available (RTC /Khata of) - a) Land Properties (ಆಸ್ತಿಯ ದಾಖಲೆಗಳ ಲಭ್ಯತೆ ಪಹಣಿ/ಖಾತೆ - ಜಮೀನಿನ ದಾಖಲೆ)', 'q20aLandProperties', 'radio', true, '[{"label": "Yes (ಹೌದು)", "value": "Yes"}, {"label": "No (ಇಲ್ಲ)", "value": "No"}]'::jsonb, 4),
    (v_sec_amenities_property, '20. Is property documents available (RTC /Khata of) - b) House Property (ವಾಸದ ಮನೆಯ ದಾಖಲೆ)', 'q20bHouseProperty', 'radio', true, '[{"label": "Yes (ಹೌದು)", "value": "Yes"}, {"label": "No (ಇಲ್ಲ)", "value": "No"}]'::jsonb, 5),
    (v_sec_amenities_property, '21. Any other Legal problems (please specify) (ಇತರೆ ಕಾನೂನಿಗೆ ಸಂಬಂಧಿಸಿದ ತೊಂದರೆಗಳಿದ್ದರೆ ನಮೂದಿಸಿ)', 'q21OtherLegalProblems', 'textarea', false, '[]'::jsonb, 6);

  -- 11. Insert Verification Question
  INSERT INTO public.survey_questions (section_id, question_text, question_code, question_type, is_required, question_options, display_order)
  VALUES 
    (v_sec_verification, 'Upload Proof of Survey Photo (ಸಮೀಕ್ಷೆ ಪುರಾವೆ photo - Mandatory)', 'proofPhotoUrl', 'photo_proof', true, '[]'::jsonb, 0);

END $$;
