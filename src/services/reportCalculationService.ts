import type { SurveyResponseData, ConsolidatedStats } from '@/types/survey';

export const reportCalculationService = {
  calculateConsolidatedStats(surveys: SurveyResponseData[]): ConsolidatedStats {
    const totalSurveys = surveys.length;

    if (totalSurveys === 0) {
      return {
        totalSurveys: 0,
        recordedFamilyMembers: 0,
        genderDistribution: [],
        ageDistribution: [],
        occupationBreakdown: [],
        educationBreakdown: [],
        houseTypeBreakdown: [],
        freeLegalAidCategoryCounts: [],
        documentAvailabilityMatrix: [],
        pendingLitigationCount: 0,
        vulnerableGroupsCounts: [],
        basicAmenitiesAvailability: [],
        householdsWithMissingDocs: 0,
        householdsWithAmenityIssues: 0,
        vulnerableHouseholds: 0,
        vulnerableCases: 0,
        averageHouseholdSize: 0,
        childrenCount: 0,
        elderlyCount: 0,
        houseOwnershipBreakdown: [],
        vehicleStatus: [],
        communityParticipation: [],
        propertyProfile: [],
        litigationDurationBreakdown: [],
        otherLegalProblemsCount: 0,
      };
    }

    // 1. Recorded Family Members
    let familyCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let otherGenderCount = 0;

    surveys.forEach((s) => {
      if (Array.isArray(s.familyMembers)) {
        familyCount += s.familyMembers.length;
        s.familyMembers.forEach((m) => {
          if (m.gender === 'Female') femaleCount++;
          else if (m.gender === 'Male') maleCount++;
          else otherGenderCount++;
        });
      }
    });

    const recordedFamilyMembers = familyCount;

    // Helper for category breakdown
    const getBreakdown = (
      getField: (s: SurveyResponseData) => string | undefined,
      labels: string[]
    ) => {
      const counts: Record<string, number> = {};
      labels.forEach((l) => (counts[l] = 0));

      surveys.forEach((s) => {
        const val = getField(s) || 'Unspecified';
        counts[val] = (counts[val] || 0) + 1;
      });

      return Object.entries(counts).map(([cat, count]) => ({
        category: cat,
        count,
        percentage: Math.round((count / totalSurveys) * 100),
      }));
    };

    // 2. Gender Distribution across family members
    const totalGenderRecorded = Math.max(1, maleCount + femaleCount + otherGenderCount);
    const genderDistribution = [
      { category: 'Male', count: maleCount, percentage: Math.round((maleCount / totalGenderRecorded) * 100) },
      { category: 'Female', count: femaleCount, percentage: Math.round((femaleCount / totalGenderRecorded) * 100) },
      { category: 'Other', count: otherGenderCount, percentage: Math.round((otherGenderCount / totalGenderRecorded) * 100) },
    ];

    // 3. Age Distribution
    const ageCounts = { '<18': 0, '18–35': 0, '36–60': 0, '60+': 0 };
    surveys.forEach((s) => {
      if (Array.isArray(s.familyMembers)) {
        s.familyMembers.forEach((m) => {
          const age = Number(m.age);
          if (isNaN(age)) return;
          if (age < 18) ageCounts['<18']++;
          else if (age <= 35) ageCounts['18–35']++;
          else if (age <= 60) ageCounts['36–60']++;
          else ageCounts['60+']++;
        });
      }
    });

    const ageDistribution = Object.entries(ageCounts).map(([range, count]) => ({
      range,
      count,
      percentage: Math.round((count / Math.max(1, familyCount)) * 100),
    }));

    // 4. Q2 Main Occupation Breakdown
    const occupationBreakdown = getBreakdown(
      (s) => s.q2MainOccupation,
      ['Agriculture', 'House Wife', 'Self Employed', 'Cooly', 'Government Employee', 'Private Employee', 'Other']
    );

    // 5. Q9 Education Qualification Breakdown
    const educationBreakdown = getBreakdown(
      (s) => s.q9EducationQualification,
      ['Below Class 10', 'Class 10', 'Class 12/2nd PUC', 'UG/PG', 'Other']
    ).map((item) => ({
      level: item.category,
      count: item.count,
      percentage: item.percentage,
    }));

    // 6. Q3 House Type Breakdown
    const houseTypeBreakdown = getBreakdown(
      (s) => s.q3HouseType,
      ['Kaccha House', 'Pucca House', 'Semi Pucca House', 'Other']
    );

    // 7. Q5 Free Legal Aid Category Breakdown
    const freeLegalAidCounts: Record<string, number> = {};
    surveys.forEach((s) => {
      if (Array.isArray(s.q5FreeLegalAidCategory)) {
        s.q5FreeLegalAidCategory.forEach((cat) => {
          freeLegalAidCounts[cat] = (freeLegalAidCounts[cat] || 0) + 1;
        });
      }
    });

    const freeLegalAidCategoryCounts = Object.entries(freeLegalAidCounts).map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalSurveys) * 100),
    }));

    // 8. Document Non-Availability Matrix (Items 1 to 8)
    const docKeys = [
      { key: 'doc1RationCard', name: 'Ration Card' },
      { key: 'doc2AadharCard', name: 'Aadhar Card' },
      { key: 'doc3BirthCertificate', name: 'Birth Certificate' },
      { key: 'doc4DeathCertificate', name: 'Death Certificate' },
      { key: 'doc5OldAgePension', name: 'Old Age Pension' },
      { key: 'doc6WidowPension', name: 'Widow Pension' },
      { key: 'doc7UdidDisabilityCard', name: 'UDID Disability Card' },
      { key: 'doc8AyushmanHealthCard', name: 'Ayushman Health Card' },
    ];

    const documentAvailabilityMatrix = docKeys.map(({ key, name }) => {
      let hasDoc = 0;
      let missing = 0;
      let notApplicable = 0;
      let notRecorded = 0;

      surveys.forEach((s) => {
        const item = s[key as keyof SurveyResponseData] as any;
        if (item && typeof item === 'object') {
          if (item.hasDocument === 'Yes') {
            hasDoc++;
          } else if (item.hasDocument === 'No') {
            missing++;
          } else if (item.hasDocument === 'Not applicable') {
            notApplicable++;
          } else {
            notRecorded++;
          }
        } else {
          notRecorded++;
        }
      });

      const denominator = hasDoc + missing;
      const percentage = denominator > 0 ? Math.round((hasDoc / denominator) * 100) : 0;

      return {
        name,
        hasDoc,
        missing,
        notApplicable,
        notRecorded,
        percentage,
      };
    });

    // 9. Q7 Pending Litigation Count
    const pendingLitigationCount = surveys.filter((s) => s.q7PendingLitigation === 'Yes').length;

    // 10. Vulnerable Groups Counts (Q12 to Q18)
    const vulnerableGroupsCounts = [
      { group: 'Transgender in Family', count: surveys.filter((s) => s.q12TransgenderInFamily === 'Yes').length },
      { group: 'Victim of Child Marriage', count: surveys.filter((s) => s.q13VictimOfChildMarriage === 'Yes').length },
      { group: 'HIV / Incurable Disease', count: surveys.filter((s) => s.q14AffectedHivIncurableDisease === 'Yes').length },
      { group: 'Victim of Child Labour', count: surveys.filter((s) => s.q15VictimOfChildLabour === 'Yes').length },
      { group: 'Victim of Bonded Labour', count: surveys.filter((s) => s.q16VictimOfBondedLabour === 'Yes').length },
      { group: 'Victim of Devadasi System', count: surveys.filter((s) => s.q17VictimOfDevadasiSystem === 'Yes').length },
      { group: 'Mental / Intellectual Disability', count: surveys.filter((s) => s.q18MentalOrIntellectualDisability === 'Yes').length },
    ];

    // 11. Q19 Basic Amenities Availability
    const basicAmenitiesAvailability = [
      { amenity: 'Water (ನೀರು)', availableCount: surveys.filter((s) => s.q19aWater === 'Yes').length, percentage: Math.round((surveys.filter((s) => s.q19aWater === 'Yes').length / totalSurveys) * 100) },
      { amenity: 'Electricity (ವಿದ್ಯುಚ್ಛಕ್ತಿ)', availableCount: surveys.filter((s) => s.q19bElectricity === 'Yes').length, percentage: Math.round((surveys.filter((s) => s.q19bElectricity === 'Yes').length / totalSurveys) * 100) },
      { amenity: 'Roads / Pathways (ರಸ್ತೆ/ದಾರಿ)', availableCount: surveys.filter((s) => s.q19cRoadsPathways === 'Yes').length, percentage: Math.round((surveys.filter((s) => s.q19cRoadsPathways === 'Yes').length / totalSurveys) * 100) },
      { amenity: 'Health Facilities (ಆರೋಗ್ಯ ಸೌಲಭ್ಯ)', availableCount: surveys.filter((s) => s.q19dHealthFacilities === 'Yes').length, percentage: Math.round((surveys.filter((s) => s.q19dHealthFacilities === 'Yes').length / totalSurveys) * 100) },
    ];

    // 12. Custom Analytics Computations
    let householdsWithMissingDocs = 0;
    surveys.forEach((s) => {
      const keys = ['doc1RationCard', 'doc2AadharCard', 'doc3BirthCertificate', 'doc4DeathCertificate', 'doc5OldAgePension', 'doc6WidowPension', 'doc7UdidDisabilityCard', 'doc8AyushmanHealthCard'];
      const hasAnyMissing = keys.some((k) => {
        const item = s[k as keyof SurveyResponseData] as any;
        return item && item.hasDocument === 'No';
      });
      if (hasAnyMissing) householdsWithMissingDocs++;
    });

    let householdsWithAmenityIssues = 0;
    surveys.forEach((s) => {
      if (s.q19aWater !== 'Yes' || s.q19bElectricity !== 'Yes' || s.q19cRoadsPathways !== 'Yes' || s.q19dHealthFacilities !== 'Yes') {
        householdsWithAmenityIssues++;
      }
    });

    let vulnerableHouseholds = 0;
    let vulnerableCases = 0;
    surveys.forEach((s) => {
      let isVulnerable = false;
      if (s.q12TransgenderInFamily === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (s.q13VictimOfChildMarriage === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (s.q14AffectedHivIncurableDisease === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (s.q15VictimOfChildLabour === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (s.q16VictimOfBondedLabour === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (s.q17VictimOfDevadasiSystem === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (s.q18MentalOrIntellectualDisability === 'Yes') { vulnerableCases++; isVulnerable = true; }
      if (isVulnerable) vulnerableHouseholds++;
    });

    let childrenCount = 0;
    let elderlyCount = 0;
    surveys.forEach((s) => {
      if (Array.isArray(s.familyMembers)) {
        s.familyMembers.forEach((m) => {
          const age = Number(m.age);
          if (isNaN(age)) return;
          if (age < 18) childrenCount++;
          if (age >= 60) elderlyCount++;
        });
      }
    });

    const averageHouseholdSize = Number(((totalSurveys + familyCount) / totalSurveys).toFixed(1));

    const houseOwnershipBreakdown = getBreakdown(
      (s) => s.q4HouseOwnership,
      ['Owned', 'Rented', 'Leased', 'Other']
    );

    const totalVehiclesWithLicense = surveys.filter((s) => s.q6HasVehicle === 'Yes' && (s.q6aDrivingLicense === 'Yes' || s.q6aDrivingLicense === 'No')).length;
    const hasLicense = surveys.filter((s) => s.q6HasVehicle === 'Yes' && s.q6aDrivingLicense === 'Yes').length;

    const totalVehiclesWithInsurance = surveys.filter((s) => s.q6HasVehicle === 'Yes' && (s.q6bInsuranceCoverage === 'Yes' || s.q6bInsuranceCoverage === 'No')).length;
    const hasInsurance = surveys.filter((s) => s.q6HasVehicle === 'Yes' && s.q6bInsuranceCoverage === 'Yes').length;

    const totalVehiclesWithRc = surveys.filter((s) => s.q6HasVehicle === 'Yes' && (s.q6cRegistrationCertificate === 'Yes' || s.q6cRegistrationCertificate === 'No')).length;
    const hasRc = surveys.filter((s) => s.q6HasVehicle === 'Yes' && s.q6cRegistrationCertificate === 'Yes').length;

    const vehicleStatus = [
      { category: 'Driving License', count: hasLicense, total: totalVehiclesWithLicense, percentage: totalVehiclesWithLicense > 0 ? Math.round((hasLicense / totalVehiclesWithLicense) * 100) : 0 },
      { category: 'Insurance Coverage', count: hasInsurance, total: totalVehiclesWithInsurance, percentage: totalVehiclesWithInsurance > 0 ? Math.round((hasInsurance / totalVehiclesWithInsurance) * 100) : 0 },
      { category: 'Registration Certificate (RC)', count: hasRc, total: totalVehiclesWithRc, percentage: totalVehiclesWithRc > 0 ? Math.round((hasRc / totalVehiclesWithRc) * 100) : 0 },
    ];

    const totalWithShg = surveys.filter((s) => s.q8MembershipOrganization === 'No' || (s.q8MembershipOrganization === 'Yes' && (s.q8aSelfHelpGroup === 'Yes' || s.q8aSelfHelpGroup === 'No'))).length;
    const hasShg = surveys.filter((s) => s.q8MembershipOrganization === 'Yes' && s.q8aSelfHelpGroup === 'Yes').length;

    const totalWithMfg = surveys.filter((s) => s.q8MembershipOrganization === 'No' || (s.q8MembershipOrganization === 'Yes' && (s.q8bMicroFinanceGroup === 'Yes' || s.q8bMicroFinanceGroup === 'No'))).length;
    const hasMfg = surveys.filter((s) => s.q8MembershipOrganization === 'Yes' && s.q8bMicroFinanceGroup === 'Yes').length;

    const totalWithMilk = surveys.filter((s) => s.q8MembershipOrganization === 'No' || (s.q8MembershipOrganization === 'Yes' && (s.q8cMilkProcurersCoop === 'Yes' || s.q8cMilkProcurersCoop === 'No'))).length;
    const hasMilk = surveys.filter((s) => s.q8MembershipOrganization === 'Yes' && s.q8cMilkProcurersCoop === 'Yes').length;

    const totalWithOtherOrg = surveys.filter((s) => s.q8MembershipOrganization === 'No' || (s.q8MembershipOrganization === 'Yes' && (s.q8dOtherOrg === 'Yes' || s.q8dOtherOrg === 'No'))).length;
    const hasOtherOrg = surveys.filter((s) => s.q8MembershipOrganization === 'Yes' && s.q8dOtherOrg === 'Yes').length;

    const communityParticipation = [
      { category: 'Self Help Group (SHG)', count: hasShg, total: totalWithShg, percentage: totalWithShg > 0 ? Math.round((hasShg / totalWithShg) * 100) : 0 },
      { category: 'Microfinance Group', count: hasMfg, total: totalWithMfg, percentage: totalWithMfg > 0 ? Math.round((hasMfg / totalWithMfg) * 100) : 0 },
      { category: 'Milk Producers Cooperative', count: hasMilk, total: totalWithMilk, percentage: totalWithMilk > 0 ? Math.round((hasMilk / totalWithMilk) * 100) : 0 },
      { category: 'Other Local Organization', count: hasOtherOrg, total: totalWithOtherOrg, percentage: totalWithOtherOrg > 0 ? Math.round((hasOtherOrg / totalWithOtherOrg) * 100) : 0 },
    ];

    const hasLand = surveys.filter((s) => s.q20aLandProperties === 'Yes').length;
    const hasHouseProp = surveys.filter((s) => s.q20bHouseProperty === 'Yes').length;
    const propertyProfile = [
      { category: 'Land Properties Ownership', count: hasLand, total: totalSurveys, percentage: Math.round((hasLand / totalSurveys) * 100) },
      { category: 'House Property Ownership', count: hasHouseProp, total: totalSurveys, percentage: Math.round((hasHouseProp / totalSurveys) * 100) },
    ];

    const litigationDurationBreakdown = getBreakdown(
      (s) => {
        const val = s.q7PendingLitigationDuration;
        if (!val) return undefined;
        if (val === '1-3 years') return '1–3 years';
        if (val === '3-5 years') return '3–5 years';
        if (val === '3years') return undefined; // Ignore/discard historical malformed test data
        return val;
      },
      ['Less than 1 year', '1–3 years', '3–5 years', 'More than 5 years']
    );

    const otherLegalProblemsCount = surveys.filter((s) => s.q21OtherLegalProblems && s.q21OtherLegalProblems.trim().length > 0).length;

    return {
      totalSurveys,
      recordedFamilyMembers,
      genderDistribution,
      ageDistribution,
      occupationBreakdown,
      educationBreakdown,
      houseTypeBreakdown,
      freeLegalAidCategoryCounts,
      documentAvailabilityMatrix,
      pendingLitigationCount,
      vulnerableGroupsCounts,
      basicAmenitiesAvailability,
      householdsWithMissingDocs,
      householdsWithAmenityIssues,
      vulnerableHouseholds,
      vulnerableCases,
      averageHouseholdSize,
      childrenCount,
      elderlyCount,
      houseOwnershipBreakdown,
      vehicleStatus,
      communityParticipation,
      propertyProfile,
      litigationDurationBreakdown,
      otherLegalProblemsCount,
    };
  },
};
