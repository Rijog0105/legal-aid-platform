export type QuestionType =
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'textarea'
  | 'family_grid'
  | 'document_survey'
  | 'sub_items_yes_no'
  | 'photo_proof';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface ConditionalLogic {
  dependsOnQuestionId: string;
  showIfValue: string | string[];
}

export interface Question {
  id: string;
  sectionId: string;
  sectionTitle: string;
  numberLabel: string;
  questionText: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  conditionalLogic?: ConditionalLogic;
  defaultValue?: any;
  subItems?: { id: string; label: string }[];
}

export interface FamilyMember {
  id: string;
  slNo: number | string;
  name: string;
  age: number | string;
  gender: string;
}

export interface DocumentSurveyItem {
  id: string;
  certificateName: string;
  hasDocument: 'Yes' | 'No' | 'Not applicable';
  namesMissing?: string;
  complaintDetails?: string;
  reasonNotObtained?: string;
  whetherApplied: 'Applied' | 'Not Applied';
}

export interface GpsLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  formattedLocation?: string;
}

export interface SurveyResponseData {
  // Header / Preliminary Information
  surveyReferenceId: string;
  campId?: string;
  villageDistrict: string; // Village/District
  dateOfDataCollection: string; // Date of Data collection
  nameOfDataCollector: string; // Name of the Data Collector
  nameOfOrganizationCollege: string; // Name of Organization/College
  addressOfFamily: string; // Address of the family whose data is collected

  // Family Members Table
  familyMembers: FamilyMember[];

  // Questions 1 to 21
  q1TotalEarningAndDependents: string; // Q1
  q2MainOccupation: string; // Q2
  q2MainOccupationOther?: string;
  q3HouseType: string; // Q3
  q3HouseTypeOther?: string;
  q4HouseOwnership: string; // Q4
  q5FreeLegalAidCategory: string[]; // Q5 (Multi-select)
  q6HasVehicle: string; // Q6 (Yes/No)
  q6aDrivingLicense?: string; // Yes/No
  q6bInsuranceCoverage?: string; // Yes/No
  q6cRegistrationCertificate?: string; // Yes/No
  q7PendingLitigation: string; // Q7 (Yes/No)
  q7PendingLitigationDuration?: string; // If yes, for how long
  q8MembershipOrganization: string; // Q8 (Yes/No)
  q8aSelfHelpGroup?: string; // Yes/No
  q8bMicroFinanceGroup?: string; // Yes/No
  q8cMilkProcurersCoop?: string; // Yes/No
  q8dOtherOrg?: string; // Yes/No
  q8dOtherOrgName?: string;

  // Survey Regarding Non-Availability of Necessary Documents (1 to 8)
  doc1RationCard: DocumentSurveyItem;
  doc2AadharCard: DocumentSurveyItem;
  doc3BirthCertificate: DocumentSurveyItem;
  doc4DeathCertificate: DocumentSurveyItem;
  doc5OldAgePension: DocumentSurveyItem;
  doc6WidowPension: DocumentSurveyItem;
  doc7UdidDisabilityCard: DocumentSurveyItem;
  doc8AyushmanHealthCard: DocumentSurveyItem;

  // Questions 9 to 21
  q9EducationQualification: string; // Q9
  q9EducationQualificationOther?: string;
  q10DiscontinuedEducation: string; // Q10 (Yes/No)
  q10DiscontinuedReason?: string;
  q11NatureOfEmployment: string; // Q11
  q11UnemployedCount?: string;
  q11UnemployedReason?: string;
  q12TransgenderInFamily: string; // Q12 (Yes/No)
  q12TransgenderDetails?: string;
  q13VictimOfChildMarriage: string; // Q13 (Yes/No)
  q13ChildMarriageDetails?: string;
  q14AffectedHivIncurableDisease: string; // Q14 (Yes/No)
  q14HivDetails?: string;
  q15VictimOfChildLabour: string; // Q15 (Yes/No)
  q15ChildLabourDetails?: string;
  q16VictimOfBondedLabour: string; // Q16 (Yes/No)
  q16BondedLabourDetails?: string;
  q17VictimOfDevadasiSystem: string; // Q17 (Yes/No)
  q17DevadasiDetails?: string;
  q18MentalOrIntellectualDisability: string; // Q18 (Yes/No)
  q18DisabilityDetails?: string;

  // Q19 Basic Amenities
  q19aWater: string; // Yes/No
  q19bElectricity: string; // Yes/No
  q19cRoadsPathways: string; // Yes/No
  q19dHealthFacilities: string; // Yes/No

  // Q20 Property Documents
  q20aLandProperties: string; // Yes/No
  q20bHouseProperty: string; // Yes/No

  // Q21 Other Legal Problems
  q21OtherLegalProblems?: string;

  // Final Mandatory Verification Photo Proof & GPS Geotag
  proofPhotoUrl: string;
  gpsLocation?: GpsLocationData;
  photoCapturedAt?: string;

  // System Metadata
  submittedBy: string;
  submittedByName?: string;
  submittedAt: string;
  status: 'draft' | 'submitted';
}

export interface ConsolidatedStats {
  totalSurveys: number;
  totalPopulationCovered: number;
  genderDistribution: { category: string; count: number; percentage: number }[];
  ageDistribution: { range: string; count: number; percentage: number }[];
  occupationBreakdown: { category: string; count: number; percentage: number }[];
  educationBreakdown: { level: string; count: number; percentage: number }[];
  houseTypeBreakdown: { category: string; count: number; percentage: number }[];
  freeLegalAidCategoryCounts: { category: string; count: number; percentage: number }[];
  documentAvailabilityMatrix: { name: string; hasDoc: number; missing: number; percentage: number }[];
  pendingLitigationCount: number;
  vulnerableGroupsCounts: { group: string; count: number }[];
  basicAmenitiesAvailability: { amenity: string; availableCount: number; percentage: number }[];
}
