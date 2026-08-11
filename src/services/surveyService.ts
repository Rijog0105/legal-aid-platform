import { supabase } from '@/services/supabase';
import type { SurveyResponseData } from '@/types/survey';

const LOCAL_STORAGE_SURVEYS_KEY = 'legal_aid_submitted_surveys_v2';
// Draft key is now generated per user/camp/template; removed global constant

export const surveyService = {
  // Save current active draft locally with safe quota handling
  saveDraft(draft: { answers: Partial<SurveyResponseData>; currentIndex: number; campId?: string }, key: string): void {
    try {
      localStorage.setItem(key, JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.error('Failed to save draft to localStorage', e);
    }
  },

  // Get active draft if any
  getDraft(key: string): { answers: Partial<SurveyResponseData>; currentIndex: number; campId?: string; updatedAt: string } | null {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to read draft from localStorage', e);
    }
    return null;
  },

  // Clear active draft
  clearDraft(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to clear draft', e);
    }
  },

  // Helper to safely store in localStorage without quota error
  safeSaveLocalSurveys(newResponse: SurveyResponseData): void {
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_SURVEYS_KEY);
      let existing: SurveyResponseData[] = existingStr ? JSON.parse(existingStr) : [];
      // Prevent duplicates
      existing = existing.filter((s) => s.surveyReferenceId !== newResponse.surveyReferenceId);
      existing.unshift(newResponse);

      // Keep up to 25 recent items in local cache
      const capped = existing.slice(0, 25);
      localStorage.setItem(LOCAL_STORAGE_SURVEYS_KEY, JSON.stringify(capped));
    } catch (quotaErr) {
      console.warn('LocalStorage quota reached, reducing cached array length', quotaErr);
      try {
        const existingStr = localStorage.getItem(LOCAL_STORAGE_SURVEYS_KEY);
        let existing: SurveyResponseData[] = existingStr ? JSON.parse(existingStr) : [];
        existing = existing.filter((s) => s.surveyReferenceId !== newResponse.surveyReferenceId);
        // Keep top 10 items with complete proofPhotoUrl intact
        const trimmed = [newResponse, ...existing.slice(0, 8)];
        localStorage.setItem(LOCAL_STORAGE_SURVEYS_KEY, JSON.stringify(trimmed));
      } catch (err) {
        console.error('Storage quota reached, skipping local cache write', err);
      }
    }
  },

  // Check if a survey reference ID has already been submitted
  async isSurveyReferenceSubmitted(referenceId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('id')
        .eq('survey_reference_id', referenceId)
        .limit(1);
      if (error) {
        console.error('Error checking survey reference submission', error);
        return false;
      }
      return Array.isArray(data) && data.length > 0;
    } catch (e) {
      console.error('Exception in isSurveyReferenceSubmitted', e);
      return false;
    }
  },
  async submitSurvey(response: SurveyResponseData): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Try persisting to Supabase
      const insertPayload = [
        {
          survey_reference_id: response.surveyReferenceId,
          camp_id: response.campId || null,
          submitted_by: response.submittedBy,
          submitted_at: response.submittedAt,
          respondent_name: response.nameOfDataCollector,
          village_name: response.villageDistrict,
          response_payload: response,
        },
      ];
      console.log('PAYLOAD', insertPayload);
      const { data, error } = await supabase
          .from('surveys')
          .insert(insertPayload)
          .select();
      console.log('DATA', data);

      if (error) {
        console.error('ERROR', error);
        return { success: false, error: error.message };
      }

      // Clear draft on successful submission
      // Draft clearing moved to caller after full success
        return { success: true };
    } catch (err: any) {
      console.error('Error submitting survey', err);
      return { success: false, error: err.message || 'Failed to submit survey' };
    }
  },

  // Fetch all submitted surveys (with relational hydration from Supabase)
  async fetchAllSurveys(campId?: string): Promise<SurveyResponseData[]> {
    try {
      // 1. Fetch survey headers
      let query = supabase.from('surveys').select('*').order('submitted_at', { ascending: false });
      if (campId) {
        query = query.eq('camp_id', campId);
      }
      const { data: headers, error: headerErr } = await query;
      if (headerErr || !headers || headers.length === 0) {
        return [];
      }

      // 2. Fetch all answers for these surveys
      const surveyIds = headers.map((h) => h.id);
      const { data: allAnswers, error: answersErr } = await supabase
        .from('survey_answers')
        .select('*')
        .in('survey_id', surveyIds);

      if (answersErr || !allAnswers) {
        // Fallback to basic headers mapping if answers query fails
        return headers.map((item: any) => ({
          id: item.id,
          surveyReferenceId: item.survey_reference_id || item.id,
          campId: item.camp_id,
          submittedBy: item.submitted_by,
          submittedAt: item.submitted_at,
          nameOfDataCollector: item.respondent_name || 'Anonymous',
          villageDistrict: item.village_name || 'Village',
        } as unknown as SurveyResponseData));
      }

      // 3. Fetch all questions to match their question_codes
      const questionIds = Array.from(new Set(allAnswers.map((a) => a.question_id)));
      const questionMap = new Map<string, { code: string; type: string }>();
      if (questionIds.length > 0) {
        const { data: allQuestions, error: questionsErr } = await supabase
          .from('survey_questions')
          .select('*')
          .in('id', questionIds);

        if (!questionsErr && allQuestions) {
          allQuestions.forEach((q) => {
            questionMap.set(q.id, { code: q.question_code, type: q.question_type });
          });
        }
      }

      // Group answers by survey_id
      const answersBySurvey = new Map<string, any[]>();
      allAnswers.forEach((ans) => {
        const list = answersBySurvey.get(ans.survey_id) || [];
        list.push(ans);
        answersBySurvey.set(ans.survey_id, list);
      });

      // 4. Hydrate each survey in the list
      const remoteSurveys = headers.map((survey: any) => {
        // If it's a legacy record with embedded payload, return it directly
        if (survey.response_payload) {
          return {
            ...(survey.response_payload as SurveyResponseData),
            id: survey.id,
          };
        }

        const answers = answersBySurvey.get(survey.id) || [];
        const hydratedAnswers: Record<string, any> = {};
        answers.forEach((ans) => {
          const qInfo = questionMap.get(ans.question_id);
          if (!qInfo) return;

          let value: any;
          if (qInfo.type === 'family_grid' || qInfo.type === 'document_survey' || qInfo.type === 'checkbox') {
            value = ans.answer_payload;
          } else {
            value = ans.answer_value;
          }
          hydratedAnswers[qInfo.code] = value;

          // Unpack nested fields from parent payloads
          if (qInfo.code === 'q6HasVehicle' && ans.answer_payload) {
            hydratedAnswers.q6aDrivingLicense = ans.answer_payload.q6aDrivingLicense;
            hydratedAnswers.q6bInsuranceCoverage = ans.answer_payload.q6bInsuranceCoverage;
            hydratedAnswers.q6cRegistrationCertificate = ans.answer_payload.q6cRegistrationCertificate;
          }
          if (qInfo.code === 'q8MembershipOrganization' && ans.answer_payload) {
            hydratedAnswers.q8aSelfHelpGroup = ans.answer_payload.q8aSelfHelpGroup;
            hydratedAnswers.q8bMicroFinanceGroup = ans.answer_payload.q8bMicroFinanceGroup;
            hydratedAnswers.q8cMilkProcurersCoop = ans.answer_payload.q8cMilkProcurersCoop;
            hydratedAnswers.q8dOtherOrg = ans.answer_payload.q8dOtherOrg;
            hydratedAnswers.q8dOtherOrgName = ans.answer_payload.q8dOtherOrgName;
          }
          if (qInfo.code === 'q2MainOccupation' && ans.answer_payload) {
            hydratedAnswers.q2MainOccupationOther = ans.answer_payload.q2MainOccupationOther;
          }
          if (qInfo.code === 'q3HouseType' && ans.answer_payload) {
            hydratedAnswers.q3HouseTypeOther = ans.answer_payload.q3HouseTypeOther;
          }
          if (qInfo.code === 'q9EducationQualification' && ans.answer_payload) {
            hydratedAnswers.q9EducationQualificationOther = ans.answer_payload.q9EducationQualificationOther;
          }
          if (qInfo.code === 'q11NatureOfEmployment' && ans.answer_payload) {
            hydratedAnswers.q11UnemployedCount = ans.answer_payload.q11UnemployedCount;
            hydratedAnswers.q11UnemployedReason = ans.answer_payload.q11UnemployedReason;
          }
        });

        const result: SurveyResponseData = {
          id: survey.id,
          surveyReferenceId: survey.survey_reference_id,
          campId: survey.camp_id || undefined,
          villageDistrict: hydratedAnswers.villageDistrict || '',
          dateOfDataCollection: hydratedAnswers.dateOfDataCollection || '',
          nameOfDataCollector: hydratedAnswers.nameOfDataCollector || '',
          nameOfOrganizationCollege: hydratedAnswers.nameOfOrganizationCollege || '',
          addressOfFamily: hydratedAnswers.addressOfFamily || '',
          familyMembers: hydratedAnswers.familyMembers || [],
          
          q1TotalEarningAndDependents: hydratedAnswers.q1TotalEarningAndDependents || '',
          q2MainOccupation: hydratedAnswers.q2MainOccupation || 'Agriculture',
          q2MainOccupationOther: hydratedAnswers.q2MainOccupationOther,
          q3HouseType: hydratedAnswers.q3HouseType || 'Pucca House',
          q3HouseTypeOther: hydratedAnswers.q3HouseTypeOther,
          q4HouseOwnership: hydratedAnswers.q4HouseOwnership || 'Owned',
          q5FreeLegalAidCategory: hydratedAnswers.q5FreeLegalAidCategory || [],
          q6HasVehicle: hydratedAnswers.q6HasVehicle || 'No',
          q6aDrivingLicense: hydratedAnswers.q6aDrivingLicense,
          q6bInsuranceCoverage: hydratedAnswers.q6bInsuranceCoverage,
          q6cRegistrationCertificate: hydratedAnswers.q6cRegistrationCertificate,
          q7PendingLitigation: hydratedAnswers.q7PendingLitigation || 'No',
          q7PendingLitigationDuration: hydratedAnswers.q7PendingLitigationDuration,
          q8MembershipOrganization: hydratedAnswers.q8MembershipOrganization || 'No',
          q8aSelfHelpGroup: hydratedAnswers.q8aSelfHelpGroup,
          q8bMicroFinanceGroup: hydratedAnswers.q8bMicroFinanceGroup,
          q8cMilkProcurersCoop: hydratedAnswers.q8cMilkProcurersCoop,
          q8dOtherOrg: hydratedAnswers.q8dOtherOrg,
          q8dOtherOrgName: hydratedAnswers.q8dOtherOrgName,

          doc1RationCard: hydratedAnswers.doc1RationCard,
          doc2AadharCard: hydratedAnswers.doc2AadharCard,
          doc3BirthCertificate: hydratedAnswers.doc3BirthCertificate,
          doc4DeathCertificate: hydratedAnswers.doc4DeathCertificate,
          doc5OldAgePension: hydratedAnswers.doc5OldAgePension,
          doc6WidowPension: hydratedAnswers.doc6WidowPension,
          doc7UdidDisabilityCard: hydratedAnswers.doc7UdidDisabilityCard,
          doc8AyushmanHealthCard: hydratedAnswers.doc8AyushmanHealthCard,

          q9EducationQualification: hydratedAnswers.q9EducationQualification || 'Below Class 10',
          q9EducationQualificationOther: hydratedAnswers.q9EducationQualificationOther,
          q10DiscontinuedEducation: hydratedAnswers.q10DiscontinuedEducation || 'No',
          q10DiscontinuedReason: hydratedAnswers.q10DiscontinuedReason,
          q11NatureOfEmployment: hydratedAnswers.q11NatureOfEmployment || 'Agriculturist',
          q11UnemployedCount: hydratedAnswers.q11UnemployedCount,
          q11UnemployedReason: hydratedAnswers.q11UnemployedReason,
          q12TransgenderInFamily: hydratedAnswers.q12TransgenderInFamily || 'No',
          q12TransgenderDetails: hydratedAnswers.q12TransgenderDetails,
          q13VictimOfChildMarriage: hydratedAnswers.q13VictimOfChildMarriage || 'No',
          q13ChildMarriageDetails: hydratedAnswers.q13ChildMarriageDetails,
          q14AffectedHivIncurableDisease: hydratedAnswers.q14AffectedHivIncurableDisease || 'No',
          q14HivDetails: hydratedAnswers.q14HivDetails,
          q15VictimOfChildLabour: hydratedAnswers.q15VictimOfChildLabour || 'No',
          q15ChildLabourDetails: hydratedAnswers.q15ChildLabourDetails,
          q16VictimOfBondedLabour: hydratedAnswers.q16VictimOfBondedLabour || 'No',
          q16BondedLabourDetails: hydratedAnswers.q16BondedLabourDetails,
          q17VictimOfDevadasiSystem: hydratedAnswers.q17VictimOfDevadasiSystem || 'No',
          q17DevadasiDetails: hydratedAnswers.q17DevadasiDetails,
          q18MentalOrIntellectualDisability: hydratedAnswers.q18MentalOrIntellectualDisability || 'No',
          q18DisabilityDetails: hydratedAnswers.q18DisabilityDetails,

          q19aWater: hydratedAnswers.q19aWater || 'No',
          q19bElectricity: hydratedAnswers.q19bElectricity || 'No',
          q19cRoadsPathways: hydratedAnswers.q19cRoadsPathways || 'No',
          q19dHealthFacilities: hydratedAnswers.q19dHealthFacilities || 'No',
          
          q20aLandProperties: hydratedAnswers.q20aLandProperties || 'No',
          q20bHouseProperty: hydratedAnswers.q20bHouseProperty || 'No',
          
          q21OtherLegalProblems: hydratedAnswers.q21OtherLegalProblems,

          proofPhotoUrl: survey.proof_photo_url || '',
          gpsLocation: survey.gps_latitude ? {
            latitude: Number(survey.gps_latitude),
            longitude: Number(survey.gps_longitude),
            accuracy: survey.gps_accuracy ? Number(survey.gps_accuracy) : undefined
          } : undefined,
          photoCapturedAt: survey.submitted_at,

          submittedBy: survey.submitted_by,
          submittedAt: survey.submitted_at,
          status: 'submitted'
        };
        return result;
      });

      return remoteSurveys;
    } catch (e) {
      console.error('[surveyService] Error loading remote surveys:', e);
      return [];
    }
  },

  // Fetch single survey by reference ID
  async fetchSurveyById(referenceId: string): Promise<SurveyResponseData | null> {
    const all = await this.fetchAllSurveys();
    return all.find((s) => s.surveyReferenceId === referenceId) || null;
  },

  // Fetch complete survey (relational hydration)
  async fetchCompleteSurvey(surveyId: string): Promise<SurveyResponseData | null> {
    try {
      // 1. Fetch survey header
      const { data: survey, error: surveyErr } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyErr || !survey) {
        console.error('[surveyService] Error fetching survey header:', surveyErr);
        return null;
      }

      // 2. Fetch answers
      const { data: answers, error: answersErr } = await supabase
        .from('survey_answers')
        .select('*')
        .eq('survey_id', surveyId);

      if (answersErr || !answers) {
        console.error('[surveyService] Error fetching survey answers:', answersErr);
        return null;
      }

      // 3. Fetch questions corresponding to the answers
      const questionIds = answers.map((a) => a.question_id);
      if (questionIds.length === 0) {
        return null;
      }
      const { data: questions, error: questionsErr } = await supabase
        .from('survey_questions')
        .select('*')
        .in('id', questionIds);

      if (questionsErr || !questions) {
        console.error('[surveyService] Error fetching survey questions:', questionsErr);
        return null;
      }

      // Create a map from question_id -> question_code & question_type
      const questionMap = new Map<string, { code: string; type: string }>();
      questions.forEach((q) => {
        questionMap.set(q.id, { code: q.question_code, type: q.question_type });
      });

      // 4. Hydrate answers into key-value map
      const hydratedAnswers: Record<string, any> = {};
      answers.forEach((ans) => {
        const qInfo = questionMap.get(ans.question_id);
        if (!qInfo) return;

        let value: any;
        if (qInfo.type === 'family_grid' || qInfo.type === 'document_survey' || qInfo.type === 'checkbox') {
          value = ans.answer_payload;
        } else {
          value = ans.answer_value;
        }
        hydratedAnswers[qInfo.code] = value;

        // Unpack nested fields from parent payloads
        if (qInfo.code === 'q6HasVehicle' && ans.answer_payload) {
          hydratedAnswers.q6aDrivingLicense = ans.answer_payload.q6aDrivingLicense;
          hydratedAnswers.q6bInsuranceCoverage = ans.answer_payload.q6bInsuranceCoverage;
          hydratedAnswers.q6cRegistrationCertificate = ans.answer_payload.q6cRegistrationCertificate;
        }
        if (qInfo.code === 'q8MembershipOrganization' && ans.answer_payload) {
          hydratedAnswers.q8aSelfHelpGroup = ans.answer_payload.q8aSelfHelpGroup;
          hydratedAnswers.q8bMicroFinanceGroup = ans.answer_payload.q8bMicroFinanceGroup;
          hydratedAnswers.q8cMilkProcurersCoop = ans.answer_payload.q8cMilkProcurersCoop;
          hydratedAnswers.q8dOtherOrg = ans.answer_payload.q8dOtherOrg;
          hydratedAnswers.q8dOtherOrgName = ans.answer_payload.q8dOtherOrgName;
        }
        if (qInfo.code === 'q2MainOccupation' && ans.answer_payload) {
          hydratedAnswers.q2MainOccupationOther = ans.answer_payload.q2MainOccupationOther;
        }
        if (qInfo.code === 'q3HouseType' && ans.answer_payload) {
          hydratedAnswers.q3HouseTypeOther = ans.answer_payload.q3HouseTypeOther;
        }
        if (qInfo.code === 'q9EducationQualification' && ans.answer_payload) {
          hydratedAnswers.q9EducationQualificationOther = ans.answer_payload.q9EducationQualificationOther;
        }
        if (qInfo.code === 'q11NatureOfEmployment' && ans.answer_payload) {
          hydratedAnswers.q11UnemployedCount = ans.answer_payload.q11UnemployedCount;
          hydratedAnswers.q11UnemployedReason = ans.answer_payload.q11UnemployedReason;
        }
      });

      // 5. Construct full SurveyResponseData object
      const result: SurveyResponseData = {
        surveyReferenceId: survey.survey_reference_id,
        campId: survey.camp_id || undefined,
        villageDistrict: hydratedAnswers.villageDistrict || '',
        dateOfDataCollection: hydratedAnswers.dateOfDataCollection || '',
        nameOfDataCollector: hydratedAnswers.nameOfDataCollector || '',
        nameOfOrganizationCollege: hydratedAnswers.nameOfOrganizationCollege || '',
        addressOfFamily: hydratedAnswers.addressOfFamily || '',
        familyMembers: hydratedAnswers.familyMembers || [],
        
        q1TotalEarningAndDependents: hydratedAnswers.q1TotalEarningAndDependents || '',
        q2MainOccupation: hydratedAnswers.q2MainOccupation || 'Agriculture',
        q2MainOccupationOther: hydratedAnswers.q2MainOccupationOther,
        q3HouseType: hydratedAnswers.q3HouseType || 'Pucca House',
        q3HouseTypeOther: hydratedAnswers.q3HouseTypeOther,
        q4HouseOwnership: hydratedAnswers.q4HouseOwnership || 'Owned',
        q5FreeLegalAidCategory: hydratedAnswers.q5FreeLegalAidCategory || [],
        q6HasVehicle: hydratedAnswers.q6HasVehicle || 'No',
        q6aDrivingLicense: hydratedAnswers.q6aDrivingLicense,
        q6bInsuranceCoverage: hydratedAnswers.q6bInsuranceCoverage,
        q6cRegistrationCertificate: hydratedAnswers.q6cRegistrationCertificate,
        q7PendingLitigation: hydratedAnswers.q7PendingLitigation || 'No',
        q7PendingLitigationDuration: hydratedAnswers.q7PendingLitigationDuration,
        q8MembershipOrganization: hydratedAnswers.q8MembershipOrganization || 'No',
        q8aSelfHelpGroup: hydratedAnswers.q8aSelfHelpGroup,
        q8bMicroFinanceGroup: hydratedAnswers.q8bMicroFinanceGroup,
        q8cMilkProcurersCoop: hydratedAnswers.q8cMilkProcurersCoop,
        q8dOtherOrg: hydratedAnswers.q8dOtherOrg,
        q8dOtherOrgName: hydratedAnswers.q8dOtherOrgName,

        doc1RationCard: hydratedAnswers.doc1RationCard,
        doc2AadharCard: hydratedAnswers.doc2AadharCard,
        doc3BirthCertificate: hydratedAnswers.doc3BirthCertificate,
        doc4DeathCertificate: hydratedAnswers.doc4DeathCertificate,
        doc5OldAgePension: hydratedAnswers.doc5OldAgePension,
        doc6WidowPension: hydratedAnswers.doc6WidowPension,
        doc7UdidDisabilityCard: hydratedAnswers.doc7UdidDisabilityCard,
        doc8AyushmanHealthCard: hydratedAnswers.doc8AyushmanHealthCard,

        q9EducationQualification: hydratedAnswers.q9EducationQualification || 'Below Class 10',
        q9EducationQualificationOther: hydratedAnswers.q9EducationQualificationOther,
        q10DiscontinuedEducation: hydratedAnswers.q10DiscontinuedEducation || 'No',
        q10DiscontinuedReason: hydratedAnswers.q10DiscontinuedReason,
        q11NatureOfEmployment: hydratedAnswers.q11NatureOfEmployment || 'Agriculturist',
        q11UnemployedCount: hydratedAnswers.q11UnemployedCount,
        q11UnemployedReason: hydratedAnswers.q11UnemployedReason,
        q12TransgenderInFamily: hydratedAnswers.q12TransgenderInFamily || 'No',
        q12TransgenderDetails: hydratedAnswers.q12TransgenderDetails,
        q13VictimOfChildMarriage: hydratedAnswers.q13VictimOfChildMarriage || 'No',
        q13ChildMarriageDetails: hydratedAnswers.q13ChildMarriageDetails,
        q14AffectedHivIncurableDisease: hydratedAnswers.q14AffectedHivIncurableDisease || 'No',
        q14HivDetails: hydratedAnswers.q14HivDetails,
        q15VictimOfChildLabour: hydratedAnswers.q15VictimOfChildLabour || 'No',
        q15ChildLabourDetails: hydratedAnswers.q15ChildLabourDetails,
        q16VictimOfBondedLabour: hydratedAnswers.q16VictimOfBondedLabour || 'No',
        q16BondedLabourDetails: hydratedAnswers.q16BondedLabourDetails,
        q17VictimOfDevadasiSystem: hydratedAnswers.q17VictimOfDevadasiSystem || 'No',
        q17DevadasiDetails: hydratedAnswers.q17DevadasiDetails,
        q18MentalOrIntellectualDisability: hydratedAnswers.q18MentalOrIntellectualDisability || 'No',
        q18DisabilityDetails: hydratedAnswers.q18DisabilityDetails,

        q19aWater: hydratedAnswers.q19aWater || 'No',
        q19bElectricity: hydratedAnswers.q19bElectricity || 'No',
        q19cRoadsPathways: hydratedAnswers.q19cRoadsPathways || 'No',
        q19dHealthFacilities: hydratedAnswers.q19dHealthFacilities || 'No',
        
        q20aLandProperties: hydratedAnswers.q20aLandProperties || 'No',
        q20bHouseProperty: hydratedAnswers.q20bHouseProperty || 'No',
        
        q21OtherLegalProblems: hydratedAnswers.q21OtherLegalProblems,

        proofPhotoUrl: survey.proof_photo_url || '',
        gpsLocation: survey.gps_latitude ? {
          latitude: Number(survey.gps_latitude),
          longitude: Number(survey.gps_longitude),
          accuracy: survey.gps_accuracy ? Number(survey.gps_accuracy) : undefined
        } : undefined,
        photoCapturedAt: survey.submitted_at,

        submittedBy: survey.submitted_by,
        submittedAt: survey.submitted_at,
        status: 'submitted'
      };

      return result;
    } catch (e) {
      console.error('[surveyService] Critical error hydrating survey:', e);
      return null;
    }
  },
};
