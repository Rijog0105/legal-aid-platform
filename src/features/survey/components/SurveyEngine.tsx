import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Save,
  Plus,
  Trash2,
  Users,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Building,
  Camera,
  Upload,
  MapPin
} from 'lucide-react';
import { SURVEY_QUESTIONS, SURVEY_SECTIONS } from '@/constants/surveyQuestions';
import type { Question, SurveyResponseData, FamilyMember, DocumentSurveyItem, GpsLocationData } from '@/types/survey';
import { surveyService } from '@/services/surveyService';
import { surveyTemplateService } from '../services/surveyTemplateService';
import { surveyQuestionService } from '../services/surveyQuestionService';
import { surveySubmissionService } from '../services/surveySubmissionService';
import { Spinner } from '@/components/ui';
import { uploadSurveyProofPhoto } from '@/features/volunteer/services/photoService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { makeDraftKey } from '@/utils/draftKey';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';
import { fetchProjects } from '@/features/projects/services/projectService';
import type { Project } from '@/types';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';

interface SurveyEngineProps {
  campId?: string;
  onComplete?: (referenceId: string) => void;
  onCancel?: () => void;
}

export const SurveyEngine: React.FC<SurveyEngineProps> = ({ campId, onComplete, onCancel }) => {
  console.log('[SurveyLifecycle] MOUNT');
  const { profile, userId, personId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { project: myAssignedProject } = useMyProjectAssignment(personId);
  const [allFacultyCamps, setAllFacultyCamps] = useState<Project[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects()
      .then((camps) => {
        setAllFacultyCamps(camps);
        if (campId) {
          const matched = camps.find((c) => c.id === campId);
          if (matched) setSelectedCamp(matched);
        } else if (myAssignedProject) {
          setSelectedCamp(myAssignedProject);
        } else if (camps.length > 0) {
          setSelectedCamp(camps[0]);
        }
      })
      .catch((err) => console.error('Failed to load faculty camps', err));
  }, [campId, myAssignedProject]);

  useEffect(() => {
    if (myAssignedProject && !selectedCamp) {
      setSelectedCamp(myAssignedProject);
    }
  }, [myAssignedProject, selectedCamp]);

  const initialRefId = useMemo(
    () => `LA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    []
  );
  console.log(`[SurveyLifecycle] generated reference: ${initialRefId}`);

  const [answers, setAnswers] = useState<Partial<SurveyResponseData>>({
    surveyReferenceId: initialRefId,
    dateOfDataCollection: new Date().toISOString().split('T')[0],
    villageDistrict: selectedCamp ? `${selectedCamp.village_name}, ${selectedCamp.district}` : '',
    nameOfDataCollector: profile?.person?.full_name || 'Student Volunteer',
    nameOfOrganizationCollege: 'REVA University',
    addressOfFamily: '',
    familyMembers: [{ id: `fam_${Date.now()}`, slNo: 1, name: '', age: '', gender: 'Male' }],
    q1TotalEarningAndDependents: '',
    q2MainOccupation: 'Agriculture',
    q3HouseType: 'Pucca House',
    q4HouseOwnership: 'Owned',
    q5FreeLegalAidCategory: [],
    q6HasVehicle: 'No',
    q7PendingLitigation: 'No',
    q8MembershipOrganization: 'No',
    doc1RationCard: { id: 'doc1RationCard', certificateName: 'Ration Card', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
    doc2AadharCard: { id: 'doc2AadharCard', certificateName: 'Aadhar Card', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
    doc3BirthCertificate: { id: 'doc3BirthCertificate', certificateName: 'Birth Certificate', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
    doc4DeathCertificate: { id: 'doc4DeathCertificate', certificateName: 'Death Certificate', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
    doc5OldAgePension: { id: 'doc5OldAgePension', certificateName: 'Old Age pension', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
    doc6WidowPension: { id: 'doc6WidowPension', certificateName: 'Widow pension', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
    doc7UdidDisabilityCard: { id: 'doc7UdidDisabilityCard', certificateName: 'Unique disability identify Card', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
    doc8AyushmanHealthCard: { id: 'doc8AyushmanHealthCard', certificateName: 'Ayushman Bharat Health Account Card', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
    q9EducationQualification: 'Below Class 10',
    q10DiscontinuedEducation: 'No',
    q11NatureOfEmployment: 'Agriculturist',
    q12TransgenderInFamily: 'No',
    q13VictimOfChildMarriage: 'No',
    q14AffectedHivIncurableDisease: 'No',
    q15VictimOfChildLabour: 'No',
    q16VictimOfBondedLabour: 'No',
    q17VictimOfDevadasiSystem: 'No',
    q18MentalOrIntellectualDisability: 'No',
    q19aWater: 'Yes',
    q19bElectricity: 'Yes',
    q19cRoadsPathways: 'Yes',
    q19dHealthFacilities: 'Yes',
    q20aLandProperties: 'Yes',
    q20bHouseProperty: 'Yes',
    proofPhotoUrl: '',
    submittedBy: userId || 'volunteer_anon',
    submittedByName: profile?.person?.full_name || 'Volunteer Surveyor',
    submittedAt: new Date().toISOString(),
    status: 'draft',
  });

  useEffect(() => {
    if (selectedCamp) {
      setAnswers((prev) => ({
        ...prev,
        campId: selectedCamp.id,
        villageDistrict: `${selectedCamp.village_name}, ${selectedCamp.district}`,
        nameOfDataCollector: profile?.person?.full_name || prev.nameOfDataCollector || 'Student Volunteer',
        nameOfOrganizationCollege: 'REVA University',
      }));
    }
  }, [selectedCamp, profile]);

  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(true);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [dynamicSections, setDynamicSections] = useState<any[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);

  useEffect(() => {
    async function loadSurveyTemplate() {
      setLoadingTemplate(true);
      try {
        const activeTpl = await surveyTemplateService.fetchActiveTemplate();
        if (activeTpl) {
          const secs = await surveyQuestionService.fetchSections(activeTpl.id);
          const qstns = await surveyQuestionService.fetchQuestions(activeTpl.id);
          if (secs.length > 0 && qstns.length > 0) {
            console.log("activeTemplate loaded status: SUCCESS", activeTpl);
            setActiveTemplate(activeTpl);
            setDynamicSections(secs);
            setDynamicQuestions(qstns.map(q => {
              const isOptionalFollowUp = q.question_code.endsWith('Details') || 
                                         q.question_code.endsWith('Reason');
              
              let questionType = q.question_type;
              let questionOptions = q.question_options;
              
              if (q.question_code === 'q7PendingLitigationDuration') {
                questionType = 'select';
                questionOptions = [
                  { label: 'Less than 1 year (1 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ)', value: 'Less than 1 year' },
                  { label: '1–3 years (1-3 ವರ್ಷಗಳು)', value: '1–3 years' },
                  { label: '3–5 years (3-5 ವರ್ಷಗಳು)', value: '3–5 years' },
                  { label: 'More than 5 years (5 ವರ್ಷಕ್ಕಿಂತ ಹೆಚ್ಚು)', value: 'More than 5 years' }
                ];
              }

              return {
                id: q.question_code,
                sectionId: secs.find(s => s.id === q.section_id)?.id || 'sec_preliminary',
                sectionTitle: secs.find(s => s.id === q.section_id)?.title || 'Section',
                numberLabel: q.question_code.toUpperCase(),
                questionText: q.question_text,
                description: q.validation_rules?.description || '',
                type: questionType as any,
                required: q.is_required && !isOptionalFollowUp,
                options: questionOptions || [],
                conditionalLogic: q.conditional_logic && q.conditional_logic.dependsOnQuestionId ? {
                  dependsOnQuestionId: q.conditional_logic.dependsOnQuestionId,
                  showIfValue: q.conditional_logic.showIfValue
                } : undefined,
                rawQuestion: q
              };
            }));
            setLoadingTemplate(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading template', err);
      }
      console.log("activeTemplate loaded status: FAILED");
      setActiveTemplate(null);
      setDynamicSections(SURVEY_SECTIONS);
      const mappedFallbackQuestions = SURVEY_QUESTIONS.map((q) => {
        const isOptionalFollowUp = q.id.endsWith('Details') || 
                                   q.id.endsWith('Reason');
        return {
          ...q,
          required: q.required && !isOptionalFollowUp
        };
      });
      setDynamicQuestions(mappedFallbackQuestions);
      setLoadingTemplate(false);
    }
    loadSurveyTemplate();
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSurvey, setSubmittedSurvey] = useState<SurveyResponseData | null>(null);
  const [autoSaveText, setAutoSaveText] = useState<string>('Draft saved');

  useEffect(() => {
    const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
    if (!draftKey) {
      console.info('[SurveyEngine] Draft not loaded: missing identifiers');
      return;
    }
    const draft = surveyService.getDraft(draftKey);
    if (draft && draft.answers && draft.answers.surveyReferenceId) {
      // Verify draft is not for an already submitted survey
      surveyService.isSurveyReferenceSubmitted(draft.answers.surveyReferenceId).then((exists) => {
        if (exists) {
          console.warn('[SurveyEngine] Discarding stale draft with submitted reference', draft.answers.surveyReferenceId);
          surveyService.clearDraft(draftKey);
        } else {
          setAnswers((prev) => ({ ...prev, ...draft.answers }));
          if (typeof draft.currentIndex === 'number') {
            setCurrentIndex(draft.currentIndex);
          }
        }
      });
    }
  }, [userId, selectedCamp?.id, campId, activeTemplate?.id]);
  const debugDraftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
  console.log('[SurveyLifecycle] draft storage exists:', debugDraftKey ? !!surveyService.getDraft(debugDraftKey) : false);
  const _draftDebug = debugDraftKey ? surveyService.getDraft(debugDraftKey) : null;
  console.log('[SurveyLifecycle] restored draft reference:', _draftDebug?.answers?.surveyReferenceId ?? null);

  const activeQuestions = useMemo(() => {
    const hiddenPreQuestions = [
      'villageDistrict',
      'dateOfDataCollection',
      'nameOfDataCollector',
      'nameOfOrganizationCollege'
    ];
    return dynamicQuestions.filter((q) => {
      if (hiddenPreQuestions.includes(q.id)) return false;
      if (!q.conditionalLogic) return true;
      const targetVal = answers[q.conditionalLogic.dependsOnQuestionId as keyof SurveyResponseData];
      if (Array.isArray(q.conditionalLogic.showIfValue)) {
        return q.conditionalLogic.showIfValue.includes(String(targetVal));
      }
      return String(targetVal) === q.conditionalLogic.showIfValue;
    });
  }, [answers, dynamicQuestions]);

  const currentQuestion: Question | undefined = activeQuestions[currentIndex] || activeQuestions[0];
  const totalQuestions = activeQuestions.length;
  const progressPercentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const currentSection = useMemo(() => {
    if (!currentQuestion) return dynamicSections[0];
    return dynamicSections.find((s) => s.id === currentQuestion.sectionId) || dynamicSections[0];
  }, [currentQuestion, dynamicSections]);

  const handleAnswerChange = (fieldId: string, value: any) => {
    setValidationError(null);
    setAnswers((prev) => {
      const updated = { ...prev, [fieldId]: value };

      // Clear dependent follow-ups when parent changes to prevent stale data
      if (fieldId === 'q6HasVehicle' && value === 'No') {
        updated.q6aDrivingLicense = undefined;
        updated.q6bInsuranceCoverage = undefined;
        updated.q6cRegistrationCertificate = undefined;
      }
      if (fieldId === 'q8MembershipOrganization' && value === 'No') {
        updated.q8aSelfHelpGroup = undefined;
        updated.q8bMicroFinanceGroup = undefined;
        updated.q8cMilkProcurersCoop = undefined;
        updated.q8dOtherOrg = undefined;
        updated.q8dOtherOrgName = undefined;
      }
      if (fieldId === 'q7PendingLitigation' && value === 'No') {
        updated.q7PendingLitigationDuration = undefined;
      }
      if (fieldId === 'q10DiscontinuedEducation' && value === 'No') {
        updated.q10DiscontinuedReason = undefined;
      }
      if (fieldId === 'q12TransgenderInFamily' && value === 'No') {
        updated.q12TransgenderDetails = undefined;
      }
      if (fieldId === 'q13VictimOfChildMarriage' && value === 'No') {
        updated.q13ChildMarriageDetails = undefined;
      }
      if (fieldId === 'q14AffectedHivIncurableDisease' && value === 'No') {
        updated.q14HivDetails = undefined;
      }
      if (fieldId === 'q15VictimOfChildLabour' && value === 'No') {
        updated.q15ChildLabourDetails = undefined;
      }
      if (fieldId === 'q16VictimOfBondedLabour' && value === 'No') {
        updated.q16BondedLabourDetails = undefined;
      }
      if (fieldId === 'q17VictimOfDevadasiSystem' && value === 'No') {
        updated.q17DevadasiDetails = undefined;
      }
      if (fieldId === 'q18MentalOrIntellectualDisability' && value === 'No') {
        updated.q18DisabilityDetails = undefined;
      }

      // Clear specify fields when parent select selection is not 'Other'
      if (fieldId === 'q2MainOccupation' && value !== 'Other') {
        updated.q2MainOccupationOther = undefined;
      }
      if (fieldId === 'q3HouseType' && value !== 'Other') {
        updated.q3HouseTypeOther = undefined;
      }
      if (fieldId === 'q9EducationQualification' && value !== 'Other') {
        updated.q9EducationQualificationOther = undefined;
      }
      if (fieldId === 'q11NatureOfEmployment' && value !== 'Other') {
        updated.q11UnemployedCount = undefined;
        updated.q11UnemployedReason = undefined;
      }

      const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
      if (draftKey) {
        surveyService.saveDraft({ answers: updated, currentIndex, campId: selectedCamp?.id || campId }, draftKey);
      } else {
        console.info(`[SurveyEngine] Draft not saved: missing identifiers (userId: ${userId}, campId: ${selectedCamp?.id || campId}, templateId: ${activeTemplate?.id})`);
      }
      return updated;
    });
    setAutoSaveText('Draft auto-saved');
  };

  // Compress Image helper using Canvas to prevent localStorage quota overflow
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Image Upload Handler for Mandatory Photo Proof with GPS Location Tagging
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file (JPG, PNG).');
      return;
    }

    try {
      const compressedUrl = await compressImage(file);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString();

      // Fetch Geolocation GPS Coordinates
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            const gpsObj: GpsLocationData = {
              latitude: lat,
              longitude: lng,
              accuracy: pos.coords.accuracy,
              formattedLocation: `${lat}° N, ${lng}° E`,
            };
            const updatedPhotoAnswers = { ...answers, proofPhotoUrl: compressedUrl, gpsLocation: gpsObj, photoCapturedAt: timeStr };
            setAnswers((prev) => ({
              ...prev,
              ...updatedPhotoAnswers,
            }));
            const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
            if (draftKey) {
              surveyService.saveDraft({
                answers: updatedPhotoAnswers,
                currentIndex,
                campId: selectedCamp?.id || campId,
              }, draftKey);
            } else {
              console.info('[SurveyEngine] Photo upload draft not saved: missing identifiers');
            }
          },
          () => {
            // Geolocation fallback
            const fallbackGps: GpsLocationData = {
              latitude: 12.9716,
              longitude: 77.5946,
              formattedLocation: '12.9716° N, 77.5946° E (Location Tagged)',
            };
            setAnswers((prev) => ({
              ...prev,
              proofPhotoUrl: compressedUrl,
              gpsLocation: fallbackGps,
              photoCapturedAt: timeStr,
            }));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        handleAnswerChange('proofPhotoUrl', compressedUrl);
      }
    } catch (err) {
      console.error('Image compression error', err);
      setValidationError('Failed to process image file. Please try another image.');
    }
  };

  // Family Roster Table logic
  const handleAddFamilyMember = () => {
    const currentMembers = answers.familyMembers || [];
    const newMember: FamilyMember = {
      id: `fam_${Date.now()}`,
      slNo: currentMembers.length + 1,
      name: '',
      age: '',
      gender: 'Male',
    };
    handleAnswerChange('familyMembers', [...currentMembers, newMember]);
  };

  const handleUpdateFamilyMember = (index: number, key: keyof FamilyMember, val: any) => {
    const currentMembers = [...(answers.familyMembers || [])];
    currentMembers[index] = { ...currentMembers[index], [key]: val };
    handleAnswerChange('familyMembers', currentMembers);
  };

  const handleRemoveFamilyMember = (index: number) => {
    const currentMembers = [...(answers.familyMembers || [])];
    if (currentMembers.length <= 1) {
      // Business rule: at least one family-member row must always remain.
      setValidationError('At least one family member is required. You cannot remove the last member.');
      return;
    }
    currentMembers.splice(index, 1);
    const reindexed = currentMembers.map((m, i) => ({ ...m, slNo: i + 1 }));
    handleAnswerChange('familyMembers', reindexed);
  };

  // Document Survey Item Helper logic
  const handleUpdateDocSurvey = (docKey: string, updates: Partial<DocumentSurveyItem>) => {
    const currentDoc = (answers[docKey as keyof SurveyResponseData] as DocumentSurveyItem) || {
      id: docKey,
      certificateName: docKey,
      hasDocument: 'Yes',
      whetherApplied: 'Not Applied',
    };
    const updatedDoc = { ...currentDoc, ...updates };
    handleAnswerChange(docKey, updatedDoc);
  };

  const validateCurrentQuestion = (): boolean => {
    if (!currentQuestion) return true;

    if (currentQuestion.required) {
      const val = answers[currentQuestion.id as keyof SurveyResponseData];
      if (val === undefined || val === null || String(val).trim() === '') {
        if (currentQuestion.id === 'q7PendingLitigationDuration') {
          setValidationError('Please select the litigation duration.');
        } else {
          setValidationError(`"${currentQuestion.questionText}" is required.`);
        }
        return false;
      }
    }

    // Validate family member roster: at least one member with name and age filled
    if (currentQuestion.type === 'family_grid') {
      const members = answers.familyMembers || [];
      if (members.length === 0) {
        setValidationError('At least one family member is required.');
        return false;
      }
      // Check every member has name and age filled (gender always has a default)
      const incomplete = members.filter((m) => !m.name?.trim() || !m.age?.toString().trim());
      if (incomplete.length > 0) {
        if (members.length === 1) {
          setValidationError('Please enter the family member\'s Name and Age before continuing.');
        } else {
          setValidationError(`${incomplete.length} family member(s) are missing Name or Age. Please complete all entries.`);
        }
        return false;
      }
    }

    // Explicitly validate vehicle follow-up selections when Q6 is answered Yes
    if (currentQuestion.id === 'q6HasVehicle') {
      const val = answers.q6HasVehicle;
      if (val === 'Yes') {
        if (!answers.q6aDrivingLicense) {
          setValidationError('Please select whether you have a Driving Licence.');
          return false;
        }
        if (!answers.q6bInsuranceCoverage) {
          setValidationError('Please select whether you have Insurance Coverage.');
          return false;
        }
        if (!answers.q6cRegistrationCertificate) {
          setValidationError('Please select whether you have a Registration Certificate of the vehicle.');
          return false;
        }
      }
    }

    setValidationError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentQuestion()) return;

    if (currentIndex < totalQuestions - 1) {
      setDirection(1);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
      if (draftKey) {
        surveyService.saveDraft({ answers, currentIndex: nextIdx, campId: selectedCamp?.id || campId }, draftKey);
      } else {
        console.info(`[SurveyEngine] Draft not saved on next: missing identifiers (userId: ${userId}, campId: ${selectedCamp?.id || campId}, templateId: ${activeTemplate?.id})`);
      }
    } else {
      handleFinalSubmission();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
      if (draftKey) {
        surveyService.saveDraft({ answers, currentIndex: prevIdx, campId: selectedCamp?.id || campId }, draftKey);
      } else {
        console.info(`[SurveyEngine] Draft not saved on previous: missing identifiers (userId: ${userId}, campId: ${selectedCamp?.id || campId}, templateId: ${activeTemplate?.id})`);
      }
    }
  };

  const handleFinalSubmission = async () => {
    if (!validateCurrentQuestion()) return;
    console.log('[SurveyLifecycle] final reference before submit:', answers.surveyReferenceId);

    // Pre-submit family member validation (guard against draft restore / edge cases)
    const membersAtSubmit = answers.familyMembers || [];
    if (membersAtSubmit.length === 0) {
      setValidationError('At least one family member is required. Please go back and add a family member.');
      return;
    }
    const incompleteAtSubmit = membersAtSubmit.filter((m) => !m.name?.trim() || !m.age?.toString().trim());
    if (incompleteAtSubmit.length > 0) {
      setValidationError(
        `${incompleteAtSubmit.length} family member(s) are missing Name or Age. Please go back and complete all entries.`
      );
      return;
    }

    if (!activeTemplate) {
      console.error("Survey submission blocked: activeTemplate is null.");
      setValidationError("Cannot submit survey. No active survey template is loaded from the database.");
      return;
    }

    // Application-level behavioral guard: block submission outside the survey phase window.
    // This enforces correct behavior in the UI — it is NOT a security control.
    // The existing Supabase RLS does not enforce time-based access windows.
    if (selectedCamp) {
      const lc = getProjectLifecycleState(selectedCamp);
      if (!lc.isSurveyActive) {
        setValidationError(
          'Survey submission is only allowed during the Survey Phase window. ' +
          'The survey phase is not currently active for this project.'
        );
        return;
      }
    }

    // Enforce mandatory Proof of Survey photo
    if (!answers.proofPhotoUrl || answers.proofPhotoUrl.trim() === '') {
      setValidationError('Proof of Survey photo is mandatory. Please capture or upload a photo before submitting.');
      return;
    }

    setIsSubmitting(true);
    const targetCampId = (selectedCamp?.id || campId || answers.campId) as string;
    if (!targetCampId) {
      setValidationError('Camp location ID is missing. Cannot submit survey.');
      setIsSubmitting(false);
      return;
    }

    let storagePath = answers.proofPhotoUrl;
    if (answers.proofPhotoUrl.startsWith('data:image/')) {
      try {
        storagePath = await uploadSurveyProofPhoto(
          targetCampId,
          answers.surveyReferenceId as string,
          answers.proofPhotoUrl
        );
      } catch (uploadErr: any) {
        console.error('Failed to upload proof photo to Supabase Storage', uploadErr);
        setValidationError(uploadErr.message || 'Failed to upload verification photo to Storage. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    const finalResponse: SurveyResponseData = {
      ...(answers as SurveyResponseData),
      proofPhotoUrl: storagePath,
      campId: targetCampId,
      villageDistrict: answers.villageDistrict || (selectedCamp ? `${selectedCamp.village_name}, ${selectedCamp.district}` : 'Village'),
      submittedBy: userId || 'volunteer_anon',
      submittedByName: profile?.person?.full_name || 'Volunteer Surveyor',
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };

    const submitPayload = {
      camp_id: finalResponse.campId!,
      template_id: activeTemplate.id,
      survey_reference_id: finalResponse.surveyReferenceId,
      submitted_by: finalResponse.submittedBy,
      gps_latitude: finalResponse.gpsLocation?.latitude,
      gps_longitude: finalResponse.gpsLocation?.longitude,
      gps_accuracy: finalResponse.gpsLocation?.accuracy,
      proof_photo_url: storagePath,
      device_telemetry: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      sync_status: 'synced' as const,
      answers: dynamicQuestions.map((dq) => {
        const rawQ = (dq as any).rawQuestion;
        const qVal = dq.id === 'proofPhotoUrl' ? storagePath : finalResponse[dq.id as keyof SurveyResponseData];
        
        let payload: any = {};
        if (dq.id === 'q6HasVehicle') {
          payload = {
            q6aDrivingLicense: finalResponse.q6aDrivingLicense || 'No',
            q6bInsuranceCoverage: finalResponse.q6bInsuranceCoverage || 'No',
            q6cRegistrationCertificate: finalResponse.q6cRegistrationCertificate || 'No'
          };
        } else if (dq.id === 'q8MembershipOrganization') {
          payload = {
            q8aSelfHelpGroup: finalResponse.q8aSelfHelpGroup || 'No',
            q8bMicroFinanceGroup: finalResponse.q8bMicroFinanceGroup || 'No',
            q8cMilkProcurersCoop: finalResponse.q8cMilkProcurersCoop || 'No',
            q8dOtherOrg: finalResponse.q8dOtherOrg || 'No',
            q8dOtherOrgName: finalResponse.q8dOtherOrgName || ''
          };
        } else if (dq.id === 'q2MainOccupation') {
          payload = { q2MainOccupationOther: finalResponse.q2MainOccupationOther || '' };
        } else if (dq.id === 'q3HouseType') {
          payload = { q3HouseTypeOther: finalResponse.q3HouseTypeOther || '' };
        } else if (dq.id === 'q9EducationQualification') {
          payload = { q9EducationQualificationOther: finalResponse.q9EducationQualificationOther || '' };
        } else if (dq.id === 'q11NatureOfEmployment') {
          payload = {
            q11UnemployedCount: finalResponse.q11UnemployedCount || '',
            q11UnemployedReason: finalResponse.q11UnemployedReason || ''
          };
        }

        return {
          question_id: rawQ.id,
          answer_value: Array.isArray(qVal) || typeof qVal === 'object' ? null : String(qVal ?? ''),
          answer_payload: Array.isArray(qVal) || typeof qVal === 'object' ? qVal : payload,
        };
      }),
    };

    const res = await surveySubmissionService.submitSurvey(submitPayload);
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedSurvey(finalResponse);
      const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
      if (draftKey) {
        surveyService.clearDraft(draftKey);
      } else {
        console.warn('[SurveyEngine] Could not clear draft on submission success: missing identifiers');
      }
      if (onComplete) {
        onComplete(finalResponse.surveyReferenceId);
      }
    } else {
      setValidationError(res.error || 'Failed to submit survey. Please try again.');
    }
  };

  const handleReset = () => {
    const draftKey = makeDraftKey(userId, selectedCamp?.id || campId, activeTemplate?.id);
    if (draftKey) {
      surveyService.clearDraft(draftKey);
    } else {
      console.warn('[SurveyEngine] Could not clear draft on reset: missing identifiers');
    }
    const newRefId = `LA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    setAnswers({
      surveyReferenceId: newRefId,
      dateOfDataCollection: new Date().toISOString().split('T')[0],
      villageDistrict: selectedCamp ? `${selectedCamp.village_name}, ${selectedCamp.district}` : '',
      nameOfDataCollector: profile?.person?.full_name || 'Student Volunteer',
      nameOfOrganizationCollege: 'REVA University',
      addressOfFamily: '',
      familyMembers: [{ id: `fam_${Date.now()}`, slNo: 1, name: '', age: '', gender: 'Male' }],
      q1TotalEarningAndDependents: '',
      q2MainOccupation: 'Agriculture',
      q3HouseType: 'Pucca House',
      q4HouseOwnership: 'Owned',
      q5FreeLegalAidCategory: [],
      q6HasVehicle: 'No',
      q7PendingLitigation: 'No',
      q8MembershipOrganization: 'No',
      doc1RationCard: { id: 'doc1RationCard', certificateName: 'Ration Card', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
      doc2AadharCard: { id: 'doc2AadharCard', certificateName: 'Aadhar Card', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
      doc3BirthCertificate: { id: 'doc3BirthCertificate', certificateName: 'Birth Certificate', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
      doc4DeathCertificate: { id: 'doc4DeathCertificate', certificateName: 'Death Certificate', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
      doc5OldAgePension: { id: 'doc5OldAgePension', certificateName: 'Old Age pension', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
      doc6WidowPension: { id: 'doc6WidowPension', certificateName: 'Widow pension', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
      doc7UdidDisabilityCard: { id: 'doc7UdidDisabilityCard', certificateName: 'Unique disability identify Card', hasDocument: 'Not applicable', whetherApplied: 'Not Applied' },
      doc8AyushmanHealthCard: { id: 'doc8AyushmanHealthCard', certificateName: 'Ayushman Bharat Health Account Card', hasDocument: 'Yes', whetherApplied: 'Not Applied' },
      q9EducationQualification: 'Below Class 10',
      q10DiscontinuedEducation: 'No',
      q11NatureOfEmployment: 'Agriculturist',
      q12TransgenderInFamily: 'No',
      q13VictimOfChildMarriage: 'No',
      q14AffectedHivIncurableDisease: 'No',
      q15VictimOfChildLabour: 'No',
      q16VictimOfBondedLabour: 'No',
      q17VictimOfDevadasiSystem: 'No',
      q18MentalOrIntellectualDisability: 'No',
      q19aWater: 'Yes',
      q19bElectricity: 'Yes',
      q19cRoadsPathways: 'Yes',
      q19dHealthFacilities: 'Yes',
      q20aLandProperties: 'Yes',
      q20bHouseProperty: 'Yes',
      proofPhotoUrl: '',
      submittedBy: userId || 'volunteer_anon',
      submittedByName: profile?.person?.full_name || 'Volunteer Surveyor',
      submittedAt: new Date().toISOString(),
      status: 'draft',
    });
    setCurrentIndex(0);
    setSubmittedSurvey(null);
  };

  // ─── AUTO-GENERATED INDIVIDUAL REPORT DISPLAY ON SUBMIT ───
  if (submittedSurvey) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 space-y-6">
        <div className="max-w-4xl mx-auto bg-emerald-600 text-white p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Survey Submitted & Individual Report Auto-Generated!</h2>
              <p className="text-xs text-emerald-100">
                Official Data Collection Sheet generated for Ref ID: <span className="font-mono font-bold">{submittedSurvey.surveyReferenceId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Conduct Next Survey
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-semibold text-xs transition-all"
              >
                Done
              </button>
            )}
          </div>
        </div>

        {/* Auto-Rendered Individual Survey Report */}
        <IndividualSurveyReport survey={submittedSurvey} onBack={onCancel || handleReset} />
      </div>
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
    }),
  };
  useEffect(() => {
    return () => console.log('[SurveyLifecycle] UNMOUNT');
  }, []);


  if (loadingTemplate) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" />
        <span className="text-xs font-semibold text-slate-500 mt-2">Loading active survey template...</span>
      </div>
    );
  }

  if (!activeTemplate) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">Survey Template Loading Failed</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            An active legal aid survey template could not be loaded from the database. Live survey submissions require a database-seeded template structure.
          </p>
          {onCancel && (
            <button
               onClick={onCancel}
               className="w-full py-3 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition-all shadow-md"
            >
              Go Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentDocItem = currentQuestion?.type === 'document_survey'
    ? (answers[currentQuestion.id as keyof SurveyResponseData] as DocumentSurveyItem) || {
        id: currentQuestion.id,
        certificateName: currentQuestion.questionText,
        hasDocument: 'Yes',
        whetherApplied: 'Not Applied',
      }
    : null;

  const isYesNoOptions = currentQuestion?.type === 'radio' &&
    currentQuestion.options?.length === 2 &&
    currentQuestion.options.some((o) => o.value === 'Yes') &&
    currentQuestion.options.some((o) => o.value === 'No');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* ─── PROFESSIONAL INSTITUTIONAL HEADER ─── */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3.5 shadow-sm">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Top Row: School branding & Ref ID */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                School of Law • Legal Services Clinic
              </span>
              <h1 className="text-sm font-black text-slate-850 tracking-tight mt-0.5">
                Legal Awareness & Household Survey
              </h1>
            </div>
            
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-400 block">Ref ID</span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {answers.surveyReferenceId}
              </span>
            </div>
          </div>

          {/* Assigned Camp info, if present */}
          {selectedCamp && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 p-2 rounded-xl">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold truncate">
                Active Camp: {selectedCamp.camp_name} ({selectedCamp.village_name}, {selectedCamp.district})
              </span>
            </div>
          )}

          {/* Progress information & Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                Question {currentIndex + 1} of {totalQuestions}
              </div>
              <div className="text-xs font-bold text-slate-700 truncate">
                {currentSection.title}
              </div>
            </div>

            {/* Quick Header Navigation Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-750'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 flex items-center gap-1 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : currentIndex === totalQuestions - 1 ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Bar & Auto-Save text */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-450">
              <span className="font-bold">{progressPercentage}% Complete</span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                  <Save className="w-3 h-3 text-emerald-500" />
                  {autoSaveText}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ─── CAMP SWITCHER CARD (For multiple assigned camps) ─── */}
      {allFacultyCamps.length > 1 && (
        <div className="max-w-2xl w-full mx-auto px-4 mt-4">
          <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-805">Switch Camp Context:</span>
            </div>
            <select
              value={selectedCamp?.id || ''}
              onChange={(e) => {
                const found = allFacultyCamps.find((c) => c.id === e.target.value);
                if (found) setSelectedCamp(found);
              }}
              className="px-2.5 py-1 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
            >
              {allFacultyCamps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.camp_name} ({c.village_name})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ─── MAIN SURVEY BODY ─── */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-4">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentQuestion?.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5"
          >
            {/* Header Block within the Card */}
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {currentSection.title}
                </span>
                {currentQuestion?.required && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                    Required *
                  </span>
                )}
              </div>
              
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {currentQuestion?.questionText}
              </h2>

              {currentQuestion?.description && (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {currentQuestion.description}
                </p>
              )}
            </div>

            {/* Validation Alert */}
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </motion.div>
            )}

            {/* ─── SURVEY FORM FIELD INPUTS ─── */}
            <div>
              {/* Text Input */}
              {currentQuestion?.type === 'text' && (
                <input
                  type="text"
                  value={String(answers[currentQuestion.id as keyof SurveyResponseData] ?? '')}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder={currentQuestion.placeholder || 'Type your answer here...'}
                  autoFocus
                  className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium shadow-sm"
                />
              )}

              {/* Number Input */}
              {currentQuestion?.type === 'number' && (
                <input
                  type="number"
                  value={String(answers[currentQuestion.id as keyof SurveyResponseData] ?? '')}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder={currentQuestion.placeholder || 'Enter numeric value...'}
                  autoFocus
                  className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium shadow-sm"
                />
              )}

              {/* Date Input */}
              {currentQuestion?.type === 'date' && (
                <input
                  type="date"
                  value={String(answers[currentQuestion.id as keyof SurveyResponseData] ?? '')}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                />
              )}

              {/* Textarea Input */}
              {currentQuestion?.type === 'textarea' && (
                <textarea
                  rows={4}
                  value={String(answers[currentQuestion.id as keyof SurveyResponseData] ?? '')}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Type detailed response...'}
                  autoFocus
                  className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-slate-400 font-medium shadow-sm"
                />
              )}

              {/* Yes / No Options Selection */}
              {isYesNoOptions ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(currentQuestion.id, 'Yes')}
                      className={`h-14 px-6 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm select-none active:scale-95 ${
                        answers[currentQuestion.id as keyof SurveyResponseData] === 'Yes'
                          ? 'bg-emerald-55 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      <span>Yes (ಹೌದು)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnswerChange(currentQuestion.id, 'No')}
                      className={`h-14 px-6 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm select-none active:scale-95 ${
                        answers[currentQuestion.id as keyof SurveyResponseData] === 'No'
                          ? 'bg-rose-55 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
                      <span>No (ಇಲ್ಲ)</span>
                    </button>
                  </div>

                  {/* Render nested follow-up questions if parent value is Yes */}
                  {answers[currentQuestion.id as keyof SurveyResponseData] === 'Yes' && (
                    <>
                      {currentQuestion.id === 'q6HasVehicle' && (
                        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-fadeIn">
                          <div className="text-xs font-bold text-slate-550 uppercase tracking-wider">
                            Additional Vehicle Details (ವಾಹನ ವಿವರಗಳು)
                          </div>
                          
                          {/* Driving Licence */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-sm font-semibold text-slate-800 block">Driving Licence (ಚಾಲನಾ ಪರವಾನಗಿ) <span className="text-rose-600">*</span></span>
                              <span className="text-xs text-slate-500">Do you have a valid driving licence?</span>
                            </div>
                            <div className="flex gap-2.5 shrink-0">
                              {['Yes', 'No'].map((val) => (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => handleAnswerChange('q6aDrivingLicense', val)}
                                  className={`w-20 h-12 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                                    answers.q6aDrivingLicense === val
                                      ? val === 'Yes'
                                        ? 'bg-emerald-55 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                                        : 'bg-rose-55 border-rose-500 text-rose-800 ring-2 ring-rose-500/10'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Insurance Coverage */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-sm font-semibold text-slate-800 block">Insurance Coverage (ವಿಮಾ ಸೌಲಭ್ಯ) <span className="text-rose-600">*</span></span>
                              <span className="text-xs text-slate-500">Is the vehicle insured?</span>
                            </div>
                            <div className="flex gap-2.5 shrink-0">
                              {['Yes', 'No'].map((val) => (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => handleAnswerChange('q6bInsuranceCoverage', val)}
                                  className={`w-20 h-12 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                                    answers.q6bInsuranceCoverage === val
                                      ? val === 'Yes'
                                        ? 'bg-emerald-55 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                                        : 'bg-rose-55 border-rose-500 text-rose-800 ring-2 ring-rose-500/10'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Registration Certificate */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-sm font-semibold text-slate-800 block">Registration Certificate (RC Book) <span className="text-rose-600">*</span></span>
                              <span className="text-xs text-slate-500">Do you have a valid RC book?</span>
                            </div>
                            <div className="flex gap-2.5 shrink-0">
                              {['Yes', 'No'].map((val) => (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => handleAnswerChange('q6cRegistrationCertificate', val)}
                                  className={`w-20 h-12 rounded-xl border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                                    answers.q6cRegistrationCertificate === val
                                      ? val === 'Yes'
                                        ? 'bg-emerald-55 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                                        : 'bg-rose-55 border-rose-500 text-rose-800 ring-2 ring-rose-500/10'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {currentQuestion.id === 'q8MembershipOrganization' && (
                        <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-fadeIn">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Organization Membership Details (ಸಂಸ್ಥೆಯ ಸದಸ್ಯತ್ವ ವಿವರಗಳು)
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2.5">
                            {/* Self Help Group */}
                            <button
                              type="button"
                              onClick={() => handleAnswerChange('q8aSelfHelpGroup', answers.q8aSelfHelpGroup === 'Yes' ? 'No' : 'Yes')}
                              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                answers.q8aSelfHelpGroup === 'Yes'
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm font-semibold">Self Help Group (ಸ್ವಸಹಾಯ ಸಂಘ - SHG)</span>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${answers.q8aSelfHelpGroup === 'Yes' ? 'bg-indigo-600 border-indigo-650 text-white' : 'bg-white border-slate-350'}`}>
                                {answers.q8aSelfHelpGroup === 'Yes' && <span className="text-xs font-black">✓</span>}
                              </div>
                            </button>

                            {/* Micro Finance Group */}
                            <button
                              type="button"
                              onClick={() => handleAnswerChange('q8bMicroFinanceGroup', answers.q8bMicroFinanceGroup === 'Yes' ? 'No' : 'Yes')}
                              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                answers.q8bMicroFinanceGroup === 'Yes'
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm font-semibold">Micro Finance Group (ಸೂಕ್ಷ್ಮ ಹಣಕಾಸು ಸಂಸ್ಥೆ)</span>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${answers.q8bMicroFinanceGroup === 'Yes' ? 'bg-indigo-600 border-indigo-650 text-white' : 'bg-white border-slate-350'}`}>
                                {answers.q8bMicroFinanceGroup === 'Yes' && <span className="text-xs font-black">✓</span>}
                              </div>
                            </button>

                            {/* Milk Producers Co-operative Association */}
                            <button
                              type="button"
                              onClick={() => handleAnswerChange('q8cMilkProcurersCoop', answers.q8cMilkProcurersCoop === 'Yes' ? 'No' : 'Yes')}
                              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                answers.q8cMilkProcurersCoop === 'Yes'
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm font-semibold">Milk Producers Co-operative Association (ಹಾಲು ಉತ್ಪಾದಕರ ಸಹಕಾರ ಸಂಘ)</span>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${answers.q8cMilkProcurersCoop === 'Yes' ? 'bg-indigo-600 border-indigo-650 text-white' : 'bg-white border-slate-350'}`}>
                                {answers.q8cMilkProcurersCoop === 'Yes' && <span className="text-xs font-black">✓</span>}
                              </div>
                            </button>

                            {/* Other */}
                            <button
                              type="button"
                              onClick={() => handleAnswerChange('q8dOtherOrg', answers.q8dOtherOrg === 'Yes' ? 'No' : 'Yes')}
                              className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                answers.q8dOtherOrg === 'Yes'
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-sm font-semibold">Other Organization (ಇತರೆ ಸಂಸ್ಥೆಗಳು)</span>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${answers.q8dOtherOrg === 'Yes' ? 'bg-indigo-600 border-indigo-650 text-white' : 'bg-white border-slate-350'}`}>
                                {answers.q8dOtherOrg === 'Yes' && <span className="text-xs font-black">✓</span>}
                              </div>
                            </button>
                          </div>

                          {answers.q8dOtherOrg === 'Yes' && (
                            <div className="space-y-1.5 animate-fadeIn">
                              <label className="text-xs font-bold text-slate-600 block">Please specify organization name (ದಯವಿಟ್ಟು ಹೆಸರನ್ನು ತಿಳಿಸಿ - Optional)</label>
                              <input
                                type="text"
                                value={answers.q8dOtherOrgName || ''}
                                onChange={(e) => handleAnswerChange('q8dOtherOrgName', e.target.value)}
                                placeholder="Enter organization name"
                                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Multi-Option Radio Cards */
                currentQuestion?.type === 'radio' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentQuestion.options?.map((opt) => {
                        const isSelected = answers[currentQuestion.id as keyof SurveyResponseData] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleAnswerChange(currentQuestion.id, opt.value)}
                            className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-sm font-semibold">{opt.label}</span>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-indigo-600 bg-white text-indigo-650' : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Specifying follow-up fields for other select choices */}
                    {currentQuestion.id === 'q2MainOccupation' && answers.q2MainOccupation === 'Other' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-600 block">Please specify occupation (ದಯವಿಟ್ಟು ವೃತ್ತಿಯನ್ನು ತಿಳಿಸಿ - Optional)</label>
                        <input
                          type="text"
                          value={answers.q2MainOccupationOther || ''}
                          onChange={(e) => handleAnswerChange('q2MainOccupationOther', e.target.value)}
                          placeholder="Specify occupation"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm animate-fadeIn"
                        />
                      </div>
                    )}

                    {currentQuestion.id === 'q3HouseType' && answers.q3HouseType === 'Other' && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-600 block">Please specify house type (ದಯವಿಟ್ಟು ಮನೆಯ ವಿಧವನ್ನು ತಿಳಿಸಿ - Optional)</label>
                        <input
                          type="text"
                          value={answers.q3HouseTypeOther || ''}
                          onChange={(e) => handleAnswerChange('q3HouseTypeOther', e.target.value)}
                          placeholder="Specify house type"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm animate-fadeIn"
                        />
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Select Input Options */}
              {currentQuestion?.type === 'select' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQuestion.options?.map((opt) => {
                      const isSelected = answers[currentQuestion.id as keyof SurveyResponseData] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswerChange(currentQuestion.id, opt.value)}
                          className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-sm font-semibold">{opt.label}</span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {currentQuestion.id === 'q9EducationQualification' && answers.q9EducationQualification === 'Other' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-xs font-bold text-slate-600 block">Please specify qualification (ದಯವಿಟ್ಟು ವಿವರ ತಿಳಿಸಿ - Optional)</label>
                      <input
                        type="text"
                        value={answers.q9EducationQualificationOther || ''}
                        onChange={(e) => handleAnswerChange('q9EducationQualificationOther', e.target.value)}
                        placeholder="Specify qualification"
                        className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm animate-fadeIn"
                      />
                    </div>
                  )}

                  {currentQuestion.id === 'q11NatureOfEmployment' && answers.q11NatureOfEmployment === 'Other' && (
                    <div className="mt-6 pt-5 border-t border-slate-100 space-y-4 animate-fadeIn">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Unemployment Details (ನಿರುದ್ಯೋಗದ ವಿವರಗಳು - Optional)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 block">Unemployed Members Count</label>
                          <input
                            type="number"
                            min="0"
                            value={answers.q11UnemployedCount || ''}
                            onChange={(e) => handleAnswerChange('q11UnemployedCount', e.target.value)}
                            placeholder="Count"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 block">Reason for Unemployment</label>
                          <input
                            type="text"
                            value={answers.q11UnemployedReason || ''}
                            onChange={(e) => handleAnswerChange('q11UnemployedReason', e.target.value)}
                            placeholder="Reason"
                            className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checkbox / Multi-Select Input */}
              {currentQuestion?.type === 'checkbox' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options?.map((opt) => {
                    const currentArr = (answers[currentQuestion.id as keyof SurveyResponseData] as string[]) || [];
                    const isChecked = currentArr.includes(opt.value);

                    const toggleCheckbox = () => {
                      const updated = isChecked
                        ? currentArr.filter((v) => v !== opt.value)
                        : [...currentArr, opt.value];
                      handleAnswerChange(currentQuestion.id, updated);
                    };

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={toggleCheckbox}
                        className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Family Members Roster Input Section */}
              {currentQuestion?.type === 'family_grid' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-sm font-bold text-slate-805 flex items-center gap-2">
                      <Users className="w-4.5 h-4.5 text-indigo-600" />
                      Family Members List (ಕುಟುಂಬದ ಸದಸ್ಯರ ಪಟ್ಟಿ)
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-extrabold px-2.5 py-1 rounded-full">
                      {(answers.familyMembers || []).length} added
                    </span>
                  </div>

                  {(answers.familyMembers || []).length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                      No family members added yet. Click &quot;Add Family Member&quot; below to begin.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(answers.familyMembers || []).map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm animate-fadeIn"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-bold text-slate-800">
                              Member #{m.slNo || idx + 1}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">
                                Full Name (ಹೆಸರು)
                              </label>
                              <input
                                type="text"
                                placeholder="Enter name"
                                value={m.name}
                                onChange={(e) => handleUpdateFamilyMember(idx, 'name', e.target.value)}
                                className="w-full p-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 block">
                                Age (ವಯಸ್ಸು)
                              </label>
                              <input
                                type="number"
                                placeholder="Age"
                                value={m.age}
                                onChange={(e) => handleUpdateFamilyMember(idx, 'age', e.target.value)}
                                className="w-full p-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-medium"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-455 block">
                                Gender (ಲಿಂಗ)
                              </label>
                              <select
                                value={m.gender}
                                onChange={(e) => handleUpdateFamilyMember(idx, 'gender', e.target.value)}
                                className="w-full p-2.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold h-[34px]"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveFamilyMember(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-200 hover:border-rose-250 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Member</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddFamilyMember}
                    className="w-full h-12 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 hover:text-indigo-850 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm select-none active:scale-[0.98]"
                  >
                    <Plus className="w-5 h-5" />
                    <span>+ Add Family Member (ಕುಟುಂಬ ಸದಸ್ಯರನ್ನು ಸೇರಿಸಿ)</span>
                  </button>
                </div>
              )}

              {/* Document Roster Survey Item Input */}
              {currentQuestion?.type === 'document_survey' && currentDocItem && (
                <div className="space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Do you have this document? (ಹೊಂದಿದ್ದಾರೆಯೇ?)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'Yes', label: 'Available' },
                        { value: 'No', label: 'Missing' },
                        { value: 'Not applicable', label: 'Not Applicable' }
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleUpdateDocSurvey(currentQuestion.id, { hasDocument: opt.value as any })}
                          className={`h-12 px-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                            currentDocItem.hasDocument === opt.value
                              ? opt.value === 'Yes'
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                                : opt.value === 'No'
                                ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/10'
                                : 'bg-slate-200 border-slate-400 text-slate-800'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Follow-up details if No */}
                  {currentDocItem.hasDocument === 'No' && (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Name of family members who do not have document / Reason:
                        </label>
                        <textarea
                          rows={2}
                          value={currentDocItem.namesMissing || ''}
                          onChange={(e) => handleUpdateDocSurvey(currentQuestion.id, { namesMissing: e.target.value })}
                          placeholder="List names or reason..."
                          className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Have you applied? (ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆಯೇ?)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'Applied', label: 'Applied' },
                            { value: 'Not Applied', label: 'Not Applied' }
                          ].map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => handleUpdateDocSurvey(currentQuestion.id, { whetherApplied: status.value as any })}
                              className={`h-12 px-3 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center select-none active:scale-95 ${
                                currentDocItem.whetherApplied === status.value
                                  ? 'bg-indigo-55 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-500/10'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Photo Upload & Proof Verification UI */}
              {currentQuestion?.type === 'photo_proof' && (
                <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="space-y-1 mb-4">
                    <h3 className="text-sm font-bold text-slate-900">Proof of Survey</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Take or capture the official verification photograph required for this survey.
                    </p>
                  </div>

                  {answers.proofPhotoUrl ? (
                    <div className="space-y-3">
                      <div className="relative max-w-sm mx-auto rounded-xl overflow-hidden border border-slate-300 shadow-sm">
                        <img
                          src={answers.proofPhotoUrl}
                          alt="Survey Location Proof"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo Captured
                        </div>
                      </div>

                      {answers.gpsLocation && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 flex flex-col items-center gap-1 max-w-sm mx-auto shadow-sm">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>GPS Location: {answers.gpsLocation.formattedLocation || `${answers.gpsLocation.latitude}° N, ${answers.gpsLocation.longitude}° E`}</span>
                          </div>
                          {answers.photoCapturedAt && (
                            <span className="text-[10px] text-slate-400">
                              Captured: {answers.photoCapturedAt}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Camera className="w-4 h-4 text-indigo-500" />
                        Retake / Replace Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 py-2">
                      <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 border border-indigo-150">
                        <Camera className="w-6 h-6" />
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        Capture / Upload Photo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card Navigation Footer */}
            <div className="mt-8 pt-5 border-t border-slate-100 grid grid-cols-2 md:flex md:items-center md:justify-between gap-4">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`h-12 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95 ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed bg-slate-150 text-slate-450 border border-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="h-12 px-6 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : currentIndex === totalQuestions - 1 ? (
                  <>
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>Submit Survey</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-5 h-5 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
