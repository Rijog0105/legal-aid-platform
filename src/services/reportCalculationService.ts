import type { SurveyResponseData, ConsolidatedStats } from '@/types/survey';

export const reportCalculationService = {
  calculateConsolidatedStats(surveys: SurveyResponseData[]): ConsolidatedStats {
    const totalSurveys = surveys.length;

    if (totalSurveys === 0) {
      return {
        totalSurveys: 0,
        totalPopulationCovered: 0,
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
      };
    }

    // 1. Total Population Covered (Head of Household + Family Members)
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

    const totalPopulationCovered = totalSurveys + familyCount;

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
    const ageCounts = { '< 18': 0, '18-35': 0, '36-60': 0, '60+': 0 };
    surveys.forEach((s) => {
      if (Array.isArray(s.familyMembers)) {
        s.familyMembers.forEach((m) => {
          const age = Number(m.age);
          if (isNaN(age)) return;
          if (age < 18) ageCounts['< 18']++;
          else if (age <= 35) ageCounts['18-35']++;
          else if (age <= 60) ageCounts['36-60']++;
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

      surveys.forEach((s) => {
        const item = s[key as keyof SurveyResponseData] as any;
        if (item && item.hasDocument === 'Yes') {
          hasDoc++;
        } else {
          missing++;
        }
      });

      return {
        name,
        hasDoc,
        missing,
        percentage: Math.round((hasDoc / totalSurveys) * 100),
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

    return {
      totalSurveys,
      totalPopulationCovered,
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
    };
  },
};
