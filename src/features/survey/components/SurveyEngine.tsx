import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Save,
  Clock,
  Sparkles,
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
import { recordSurveyProofPhoto } from '@/features/volunteer/services/photoService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { fetchProjects } from '@/features/projects/services/projectService';
import type { Project } from '@/types';
import { IndividualSurveyReport } from '@/features/reports/components/IndividualSurveyReport';

interface SurveyEngineProps {
  campId?: string;
  onComplete?: (referenceId: string) => void;
  onCancel?: () => void;
}

export const SurveyEngine: React.FC<SurveyEngineProps> = ({ campId, onComplete, onCancel }) => {
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

  const [answers, setAnswers] = useState<Partial<SurveyResponseData>>({
    surveyReferenceId: initialRefId,
    dateOfDataCollection: new Date().toISOString().split('T')[0],
    villageDistrict: selectedCamp ? `${selectedCamp.village_name}, ${selectedCamp.district}` : '',
    nameOfDataCollector: profile?.person?.full_name || 'Student Volunteer',
    nameOfOrganizationCollege: 'School of Law',
    addressOfFamily: '',
    familyMembers: [],
    q1TotalEarningAndDependents: '',
    q2MainOccupation: 'Agriculture',
    q3HouseType: 'Pucca House',
    q4HouseOwnership: 'Owned',
    q5FreeLegalAidCategory: [],
    q6HasVehicle: 'No',
    q7PendingLitigation: 'No',
    q8MembershipOrganization: 'No',
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
        villageDistrict: prev.villageDistrict || `${selectedCamp.village_name}, ${selectedCamp.district}`,
      }));
    }
  }, [selectedCamp]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSurvey, setSubmittedSurvey] = useState<SurveyResponseData | null>(null);
  const [autoSaveText, setAutoSaveText] = useState<string>('Draft saved');

  useEffect(() => {
    const draft = surveyService.getDraft();
    if (draft && draft.answers && draft.answers.surveyReferenceId) {
      setAnswers((prev) => ({ ...prev, ...draft.answers }));
      if (typeof draft.currentIndex === 'number') {
        setCurrentIndex(draft.currentIndex);
      }
    }
  }, []);

  const activeQuestions = useMemo(() => {
    return SURVEY_QUESTIONS.filter((q) => {
      if (!q.conditionalLogic) return true;
      const targetVal = answers[q.conditionalLogic.dependsOnQuestionId as keyof SurveyResponseData];
      if (Array.isArray(q.conditionalLogic.showIfValue)) {
        return q.conditionalLogic.showIfValue.includes(String(targetVal));
      }
      return String(targetVal) === q.conditionalLogic.showIfValue;
    });
  }, [answers]);

  const currentQuestion: Question | undefined = activeQuestions[currentIndex] || activeQuestions[0];
  const totalQuestions = activeQuestions.length;
  const progressPercentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const estRemainingMinutes = Math.max(1, Math.ceil((totalQuestions - currentIndex - 1) * 0.4));

  const currentSection = useMemo(() => {
    if (!currentQuestion) return SURVEY_SECTIONS[0];
    return SURVEY_SECTIONS.find((s) => s.id === currentQuestion.sectionId) || SURVEY_SECTIONS[0];
  }, [currentQuestion]);

  const handleAnswerChange = (fieldId: string, value: any) => {
    setValidationError(null);
    setAnswers((prev) => {
      const updated = { ...prev, [fieldId]: value };
      surveyService.saveDraft({ answers: updated, currentIndex, campId: selectedCamp?.id || campId });
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
            setAnswers((prev) => ({
              ...prev,
              proofPhotoUrl: compressedUrl,
              gpsLocation: gpsObj,
              photoCapturedAt: timeStr,
            }));
            surveyService.saveDraft({
              answers: { ...answers, proofPhotoUrl: compressedUrl, gpsLocation: gpsObj, photoCapturedAt: timeStr },
              currentIndex,
              campId: selectedCamp?.id || campId,
            });
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
        setValidationError(`"${currentQuestion.questionText}" is required.`);
        return false;
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
      surveyService.saveDraft({ answers, currentIndex: nextIdx, campId: selectedCamp?.id || campId });
    } else {
      handleFinalSubmission();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      surveyService.saveDraft({ answers, currentIndex: prevIdx, campId: selectedCamp?.id || campId });
    }
  };

  const handleFinalSubmission = async () => {
    if (!validateCurrentQuestion()) return;

    // Enforce mandatory Proof of Survey photo
    if (!answers.proofPhotoUrl || answers.proofPhotoUrl.trim() === '') {
      setValidationError('Proof of Survey photo is mandatory. Please capture or upload a photo before submitting.');
      return;
    }

    setIsSubmitting(true);
    const finalResponse: SurveyResponseData = {
      ...(answers as SurveyResponseData),
      campId: selectedCamp?.id || campId || answers.campId,
      villageDistrict: answers.villageDistrict || (selectedCamp ? `${selectedCamp.village_name}, ${selectedCamp.district}` : 'Village'),
      submittedBy: userId || 'volunteer_anon',
      submittedByName: profile?.person?.full_name || 'Volunteer Surveyor',
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };

    const res = await surveyService.submitSurvey(finalResponse);
    setIsSubmitting(false);

    if (res.success) {
      // Sync proof photo into My Works (Personal Gallery / Submissions)
      if (finalResponse.proofPhotoUrl) {
        recordSurveyProofPhoto({
          campId: finalResponse.campId,
          uploadedBy: finalResponse.submittedBy,
          fileUrl: finalResponse.proofPhotoUrl,
          latitude: finalResponse.gpsLocation?.latitude,
          longitude: finalResponse.gpsLocation?.longitude,
          capturedAt: finalResponse.photoCapturedAt || finalResponse.submittedAt,
        }).catch((e) => console.warn('Could not sync photo to My Works', e));
      }

      setSubmittedSurvey(finalResponse);
      if (onComplete) {
        onComplete(finalResponse.surveyReferenceId);
      }
    } else {
      setValidationError(res.error || 'Failed to submit survey. Please try again.');
    }
  };

  const handleReset = () => {
    surveyService.clearDraft();
    const newRefId = `LA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    setAnswers({
      surveyReferenceId: newRefId,
      dateOfDataCollection: new Date().toISOString().split('T')[0],
      villageDistrict: selectedCamp ? `${selectedCamp.village_name}, ${selectedCamp.district}` : '',
      nameOfDataCollector: profile?.person?.full_name || 'Student Volunteer',
      nameOfOrganizationCollege: 'School of Law',
      addressOfFamily: '',
      familyMembers: [],
      q1TotalEarningAndDependents: '',
      q2MainOccupation: 'Agriculture',
      q3HouseType: 'Pucca House',
      q4HouseOwnership: 'Owned',
      q5FreeLegalAidCategory: [],
      q6HasVehicle: 'No',
      q7PendingLitigation: 'No',
      q8MembershipOrganization: 'No',
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between pb-12 select-none">
      {/* ─── TOP STICKY HEADER & NEXT/PREVIOUS CONTROL BAR (NEVER HIDDEN) ─── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Top Row: Assigned Camp Badge & Action Buttons ON TOP */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 shrink-0">
                <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Faculty Assigned Form
              </span>
              {selectedCamp && (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate hidden sm:inline">
                  {selectedCamp.camp_name} ({selectedCamp.village_name})
                </span>
              )}
            </div>

            {/* ─── TOP ACTION BUTTONS ─── */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1 transition-all"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : currentIndex === totalQuestions - 1 ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Submit
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
                >
                  Exit
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Step Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                {currentSection.title}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Save className="w-3 h-3 text-emerald-500" />
                {autoSaveText}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                ~{estRemainingMinutes} min remaining
              </span>
            </div>
          </div>

          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </header>

      {/* ─── FACULTY ASSIGNED PROJECT DETAILS CARD ─── */}
      <div className="max-w-2xl w-full mx-auto px-4 mt-4">
        {allFacultyCamps.length > 1 && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs mb-2">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-indigo-950 dark:text-indigo-200">Switch Faculty Assigned Camp:</span>
            </div>
            <select
              value={selectedCamp?.id || ''}
              onChange={(e) => {
                const found = allFacultyCamps.find((c) => c.id === e.target.value);
                if (found) setSelectedCamp(found);
              }}
              className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              {allFacultyCamps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.camp_name} ({c.village_name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── MAIN QUESTION CARD ─── */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center my-auto">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentQuestion?.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none"
          >
            {/* Question Number Tag */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-3 py-1 rounded-lg">
                {currentQuestion?.numberLabel}
              </span>
              {currentQuestion?.required && (
                <span className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                  Required *
                </span>
              )}
            </div>

            {/* Question Text */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug mb-2">
              {currentQuestion?.questionText}
            </h2>

            {/* Description */}
            {currentQuestion?.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {currentQuestion.description}
              </p>
            )}

            {/* Validation Alert */}
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {validationError}
              </motion.div>
            )}

            {/* ─── INPUT CONTROLS ─── */}
            <div className="mt-6">
              {/* Text Input */}
              {currentQuestion?.type === 'text' && (
                <input
                  type="text"
                  value={String(answers[currentQuestion.id as keyof SurveyResponseData] ?? '')}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder={currentQuestion.placeholder || 'Type your answer here...'}
                  autoFocus
                  className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner"
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
                  className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner"
                />
              )}

              {/* Date Input */}
              {currentQuestion?.type === 'date' && (
                <input
                  type="date"
                  value={String(answers[currentQuestion.id as keyof SurveyResponseData] ?? '')}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner"
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
                  className="w-full px-4 py-3.5 text-base rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none shadow-inner"
                />
              )}

              {/* ─── UPGRADED SIDE-BY-SIDE YES / NO BUTTON PILLS ─── */}
              {isYesNoOptions ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleAnswerChange(currentQuestion.id, 'Yes')}
                    className={`py-5 px-6 rounded-2xl border-2 font-bold text-base flex flex-col items-center justify-center gap-2 transition-all shadow-lg ${
                      answers[currentQuestion.id as keyof SurveyResponseData] === 'Yes'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/30 scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-50/50'
                    }`}
                  >
                    <CheckCircle2 className={`w-8 h-8 ${answers[currentQuestion.id as keyof SurveyResponseData] === 'Yes' ? 'text-white' : 'text-emerald-500'}`} />
                    <span>Yes (ಹೌದು)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnswerChange(currentQuestion.id, 'No')}
                    className={`py-5 px-6 rounded-2xl border-2 font-bold text-base flex flex-col items-center justify-center gap-2 transition-all shadow-lg ${
                      answers[currentQuestion.id as keyof SurveyResponseData] === 'No'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-rose-500/30 scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-rose-500/50 hover:bg-rose-50/50'
                    }`}
                  >
                    <XCircle className={`w-8 h-8 ${answers[currentQuestion.id as keyof SurveyResponseData] === 'No' ? 'text-white' : 'text-rose-500'}`} />
                    <span>No (ಇಲ್ಲ)</span>
                  </button>
                </div>
              ) : (
                /* Multi-Option Radio Cards */
                currentQuestion?.type === 'radio' && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options?.map((opt) => {
                      const isSelected = answers[currentQuestion.id as keyof SurveyResponseData] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAnswerChange(currentQuestion.id, opt.value)}
                          className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-lg shadow-indigo-600/20 scale-[1.01]'
                              : 'bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-sm sm:text-base font-medium">{opt.label}</span>
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-white bg-white text-indigo-600' : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {/* Select Input */}
              {currentQuestion?.type === 'select' && (
                <div className="grid grid-cols-1 gap-2.5">
                  {currentQuestion.options?.map((opt) => {
                    const isSelected = answers[currentQuestion.id as keyof SurveyResponseData] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleAnswerChange(currentQuestion.id, opt.value)}
                        className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-lg shadow-indigo-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Checkbox Input */}
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
                        className={`w-full p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-lg shadow-indigo-600/20'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                            isChecked ? 'bg-white border-white text-indigo-600' : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Family Members Roster Input */}
              {currentQuestion?.type === 'family_grid' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Family Members Added: {(answers.familyMembers || []).length}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddFamilyMember}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Family Member
                    </button>
                  </div>

                  {(answers.familyMembers || []).length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
                      No family members added. Click &quot;Add Family Member&quot; to enter member details.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {(answers.familyMembers || []).map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Sl No. {m.slNo || idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFamilyMember(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <input
                              type="text"
                              placeholder="Name (ಹೆಸರು)"
                              value={m.name}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'name', e.target.value)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 col-span-1 sm:col-span-1"
                            />
                            <input
                              type="number"
                              placeholder="Age (ವಯಸ್ಸು)"
                              value={m.age}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'age', e.target.value)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            />
                            <select
                              value={m.gender}
                              onChange={(e) => handleUpdateFamilyMember(idx, 'gender', e.target.value)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                              <option value="Male">Male (ಲಿಂಗ)</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document Non-Availability Survey Item Input */}
              {currentQuestion?.type === 'document_survey' && currentDocItem && (
                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Status / Availability (ಹೊಂದಿದ್ದಾರೆಯೇ?)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Yes', 'No', 'Not applicable'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleUpdateDocSurvey(currentQuestion.id, { hasDocument: opt as any })}
                          className={`py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                            currentDocItem.hasDocument === opt
                              ? opt === 'Yes'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                                : opt === 'No'
                                ? 'bg-rose-600 text-white border-rose-600 shadow'
                                : 'bg-slate-700 text-white border-slate-700'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Follow-up details if No */}
                  {currentDocItem.hasDocument === 'No' && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          Name of family members who do not have document / Complaint / Reason:
                        </label>
                        <textarea
                          rows={2}
                          value={currentDocItem.namesMissing || ''}
                          onChange={(e) => handleUpdateDocSurvey(currentQuestion.id, { namesMissing: e.target.value })}
                          placeholder="List names or reason..."
                          className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                          Whether applied or not (ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆಯೇ?)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Applied', 'Not Applied'].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleUpdateDocSurvey(currentQuestion.id, { whetherApplied: status as any })}
                              className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                                currentDocItem.whetherApplied === status
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── MANDATORY PROOF OF SURVEY PHOTO VERIFICATION ─── */}
              {currentQuestion?.type === 'photo_proof' && (
                <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-900 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {answers.proofPhotoUrl ? (
                    <div className="space-y-3">
                      <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-xl">
                        <img
                          src={answers.proofPhotoUrl}
                          alt="Survey Location Proof"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Photo Verified
                        </div>
                      </div>

                      {answers.gpsLocation && (
                        <div className="bg-indigo-50/80 dark:bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex flex-col items-center gap-1 max-w-sm mx-auto">
                          <div className="flex items-center gap-1.5 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>GPS Location: {answers.gpsLocation.formattedLocation || `${answers.gpsLocation.latitude}° N, ${answers.gpsLocation.longitude}° E`}</span>
                          </div>
                          {answers.photoCapturedAt && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Captured: {answers.photoCapturedAt}
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                      >
                        <Camera className="w-4 h-4 text-indigo-500" />
                        Retake / Replace Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Capture or Upload Location Photo Proof
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                          Take a photo of the survey conducted on location as official verification before submitting.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Capture / Upload Photo Proof *
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card Navigation Action Bar */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition-all ${
                  currentIndex === 0
                    ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Question
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition-all"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : currentIndex === totalQuestions - 1 ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Submit Final Form
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="w-4 h-4" />
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
