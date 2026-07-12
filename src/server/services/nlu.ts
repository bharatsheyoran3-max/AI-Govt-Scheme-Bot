import type { UserProfile } from "../../lib/schemes";

export interface NluResult {
  query: string;
  matchedSchemeIds: string[];
  extractedProfile: Partial<UserProfile>;
  confidence: number;
}

// Maps common colloquial terms in Hindi/English/Bengali/Tamil/Telugu/Marathi to parameters
const KEYWORD_MAPS = {
  "pm-kisan": [
    "farmer", "kisan", "kheti", "land", "farming", "crop", "fasal", "किसान", "खेती", "চাষী", "কৃষক", "விவசாயி", "రైతు", "शेतकरी"
  ],
  "ayushman-bharat": [
    "hospital", "health", "medical", "treatment", "illness", "doctor", "medicine", "card", "hospitalization",
    "अस्पताल", "इलाज", "स्वास्थ्य", "बीमारी", "হাসপাতাল", "চিকিৎসা", "மருத்துவமனை", "சிகிச்சை", "ఆసుపత్రి", "చికిత్స", "दवाखाना"
  ],
  "ujjwala": [
    "gas", "cylinder", "lpg", "stove", "cooking", "chulha", "fuel", "women",
    "गैस", "सिलेंडर", "चूल्हा", "महिला", "গ্যাস", "সিলিন্ডার", "சமையல் எரிவாயு", "எரிவாயு", "గ్యాస్", "సిలిండర్", "महिला"
  ],
  "post-matric-sc": [
    "scholarship", "student", "college", "school", "fees", "study", "education", "matric",
    "छात्रवृत्ति", "पढ़ाई", "स्कूल", "कॉलेज", "छात्र", "বৃত্তি", "மாணவர்", "கல்வி", "స్కాలర్‌షిప్", "విద్యార్థి", "शिष्यवृत्ती"
  ],
  "ignoaps": [
    "pension", "old age", "elderly", "aged", "retirement", "dada", "dadi",
    "पेंशन", "बुढ़ापा", "वृद्ध", "বয়স্ক ভাতা", "ஓய்வூதியம்", "முதியோர்", "పింఛను", "వృద్ధాప్య", "म्हातारे"
  ]
};

export const nluService = {
  parseQuery(query: string): NluResult {
    const text = query.toLowerCase().trim();
    const matchedSchemeIds: string[] = [];
    const extractedProfile: Partial<UserProfile> = {};
    let score = 0;

    // 1. Identify schemes from keywords
    for (const [schemeId, keywords] of Object.entries(KEYWORD_MAPS)) {
      const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
      if (matchCount > 0) {
        matchedSchemeIds.push(schemeId);
        score += matchCount * 0.3;
      }
    }

    // 2. Extract profile entities (Age)
    // Match "65 years", "65 साल", "65 বছর", "उम्र 65", etc.
    const ageRegex = /(\b\d{1,3}\b)\s*(years?|old|sal|saal|year|साल|वर्ष|বছর|வயது|సంవత్సరాల|वय)/i;
    const ageMatch = text.match(ageRegex) || text.match(/\b(age|उम्र|वय)\b\s*(\d{1,3})/i);
    if (ageMatch) {
      const ageVal = parseInt(ageMatch[1] || ageMatch[2]);
      if (ageVal > 0 && ageVal < 120) {
        extractedProfile.age = ageVal;
        score += 0.5;
      }
    } else {
      // Direct number check: check if there's a standalone number in context of age
      const standaloneNum = text.match(/\b\d{2}\b/);
      if (standaloneNum) {
        const num = parseInt(standaloneNum[0]);
        if (num >= 18 && num <= 100) {
          extractedProfile.age = num;
          score += 0.2;
        }
      }
    }

    // 3. Extract profile entities (Income)
    // Match "1 lakh", "100000", "50000", "2.5 lakh", "50 हजार"
    const lakhMatch = text.match(/(\d+(\.\d+)?)\s*(lakhs?|lakh|लाख|লাখ|லட்சம்|లక్ష|लाख)/i);
    if (lakhMatch) {
      const multiplier = 100000;
      extractedProfile.income = Math.round(parseFloat(lakhMatch[1]) * multiplier);
      score += 0.5;
    } else {
      const thousandMatch = text.match(/(\d+)\s*(thousand|k|हजार|হাজার|ஆயிரம்|వేల|हजार)/i);
      if (thousandMatch) {
        extractedProfile.income = parseInt(thousandMatch[1]) * 1000;
        score += 0.4;
      } else {
        const directAmount = text.match(/\b\d{5,7}\b/);
        if (directAmount) {
          extractedProfile.income = parseInt(directAmount[0]);
          score += 0.4;
        }
      }
    }

    // 4. Extract profile entities (Gender)
    if (text.includes("female") || text.includes("woman") || text.includes("lady") || text.includes("महिला") || text.includes("स्त्री") || text.includes("নারী") || text.includes("பெண்") || text.includes("స్త్రీ")) {
      extractedProfile.gender = "female";
      score += 0.4;
    } else if (text.includes("male") || text.includes("man") || text.includes("पुरुष") || text.includes("पुरुष") || text.includes("পুরুষ") || text.includes("ஆண்") || text.includes("పురుషుడు")) {
      extractedProfile.gender = "male";
      score += 0.3;
    }

    // 5. Extract profile entities (Occupation)
    if (text.includes("farmer") || text.includes("kisan") || text.includes("kheti") || text.includes("किसान") || text.includes("चাষী")) {
      extractedProfile.occupation = "farmer";
      score += 0.4;
    } else if (text.includes("student") || text.includes("college") || text.includes("school") || text.includes("छात्र") || text.includes("மாணவர்")) {
      extractedProfile.occupation = "student";
      score += 0.4;
    } else if (text.includes("retired") || text.includes("pensioner") || text.includes("सेवानिवृत्त")) {
      extractedProfile.occupation = "retired";
      score += 0.4;
    }

    // 6. Extract social category
    if (text.includes("sc") || text.includes("scheduled caste") || text.includes("अनुसूचित जाति")) {
      extractedProfile.category = "sc";
      score += 0.5;
    } else if (text.includes("st") || text.includes("scheduled tribe") || text.includes("अनुसूचित जनजाति")) {
      extractedProfile.category = "st";
      score += 0.5;
    } else if (text.includes("obc") || text.includes("backward class") || text.includes("अन्य पिछड़ा वर्ग")) {
      extractedProfile.category = "obc";
      score += 0.5;
    } else if (text.includes("ews") || text.includes("economically weaker")) {
      extractedProfile.category = "ews";
      score += 0.5;
    } else if (text.includes("general") || text.includes("सामान्य")) {
      extractedProfile.category = "general";
      score += 0.3;
    }

    return {
      query,
      matchedSchemeIds,
      extractedProfile,
      confidence: Math.min(1.0, score),
    };
  }
};
