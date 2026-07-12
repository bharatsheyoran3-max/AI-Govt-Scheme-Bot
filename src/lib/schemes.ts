// Scheme catalog + declarative rule DSL.
// Each rule condition references keys on UserProfile.

import type { LangCode } from "./i18n";

export type Gender = "male" | "female" | "other";
export type Occupation = "farmer" | "student" | "salaried" | "self" | "unemployed" | "retired";
export type Category = "general" | "obc" | "sc" | "st" | "ews";
export type LandBucket = "none" | "small" | "medium" | "large";
export type RationCard = "bpl" | "aay" | "apl" | "none";

export interface UserProfile {
  state?: string;
  age?: number;
  gender?: Gender;
  income?: number; // annual household income in INR
  occupation?: Occupation;
  category?: Category;
  land?: LandBucket;
  disability?: boolean;
  ration?: RationCard;
  familySize?: number;
}

export type Condition =
  | { field: keyof UserProfile; op: "eq" | "neq"; value: string | number | boolean }
  | { field: keyof UserProfile; op: "in"; value: (string | number | boolean)[] }
  | { field: keyof UserProfile; op: "gte" | "lte" | "gt" | "lt"; value: number }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface Scheme {
  id: string;
  ministry: string;
  sourceUrl: string;
  name: Partial<Record<LangCode, string>>;
  summary: Partial<Record<LangCode, string>>;
  benefit: Partial<Record<LangCode, string>>;
  whereToApply: Partial<Record<LangCode, string>>;
  documents: string[]; // stable ids in DOC_LABELS
  rule: Condition;
  // Fields that, if unknown, drop the match to "medium" confidence
  softFields?: (keyof UserProfile)[];
}

export const DOC_LABELS: Record<string, Partial<Record<LangCode, string>>> = {
  aadhaar: { en: "Aadhaar card", hi: "आधार कार्ड", bn: "আধার কার্ড", ta: "ஆதார் அட்டை", te: "ఆధార్ కార్డ్", mr: "आधार कार्ड" },
  bank: { en: "Bank passbook", hi: "बैंक पासबुक", bn: "ব্যাংক পাসবই", ta: "வங்கி பாஸ்புக்", te: "బ్యాంక్ పాస్‌బుక్", mr: "बँक पासबुक" },
  income: { en: "Income certificate", hi: "आय प्रमाणपत्र", bn: "আয় সনদ", ta: "வருமான சான்றிதழ்", te: "ఆదాయ ధృవీకరణ పత్రం", mr: "उत्पन्न प्रमाणपत्र" },
  caste: { en: "Caste certificate", hi: "जाति प्रमाणपत्र", bn: "জাতি সনদ", ta: "சாதிச் சான்றிதழ்", te: "కుల ధృవీకరణ పత్రం", mr: "जात प्रमाणपत्र" },
  land: { en: "Land ownership record", hi: "भूमि रिकॉर्ड", bn: "জমির নথি", ta: "நில உரிமை ஆவணம்", te: "భూమి రికార్డు", mr: "जमीन नोंद" },
  ration: { en: "Ration card", hi: "राशन कार्ड", bn: "রেশন কার্ড", ta: "ரேஷன் அட்டை", te: "రేషన్ కార్డ్", mr: "रेशन कार्ड" },
  age: { en: "Age proof / Birth certificate", hi: "आयु प्रमाण", bn: "বয়সের প্রমাণ", ta: "வயது சான்று", te: "వయస్సు ధృవీకరణ", mr: "वयाचा पुरावा" },
  disability: { en: "Disability certificate (40%+)", hi: "विकलांगता प्रमाणपत्र", bn: "প্রতিবন্ধিতা সনদ", ta: "மாற்றுத்திறனாளி சான்றிதழ்", te: "వైకల్య ధృవీకరణ", mr: "अपंगत्व प्रमाणपत्र" },
  photo: { en: "Passport size photo", hi: "पासपोर्ट फोटो", bn: "পাসপোর্ট ছবি", ta: "பாஸ்போர்ட் புகைப்படம்", te: "పాస్‌పోర్ట్ ఫోటో", mr: "पासपोर्ट फोटो" },
  mobile: { en: "Mobile number linked to Aadhaar", hi: "आधार से जुड़ा मोबाइल नंबर", bn: "আধারের সাথে যুক্ত মোবাইল", ta: "ஆதாருடன் இணைந்த மொபைல்", te: "ఆధార్‌తో లింక్డ్ మొబైల్", mr: "आधारशी जोडलेला मोबाइल" },
  school: { en: "School / college enrolment proof", hi: "स्कूल/कॉलेज नामांकन प्रमाण", bn: "স্কুল/কলেজ ভর্তির প্রমাণ", ta: "பள்ளி/கல்லூரி சேர்க்கை", te: "స్కూల్/కాలేజీ నమోదు", mr: "शाळा/कॉलेज नोंदणी" },
};

export const SCHEMES: Scheme[] = [
  {
    id: "pm-kisan",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    sourceUrl: "https://pmkisan.gov.in",
    name: {
      en: "PM-KISAN Samman Nidhi",
      hi: "पीएम-किसान सम्मान निधि",
      bn: "পিএম-কিসান সম্মান নিধি",
      ta: "பிஎம்-கிசான் சம்மான் நிதி",
      te: "పీఎం-కిసాన్ సమ్మాన్ నిధి",
      mr: "पीएम-किसान सन्मान निधी",
    },
    summary: {
      en: "Income support for small and marginal farmer families.",
      hi: "छोटे और सीमांत किसान परिवारों के लिए आय सहायता।",
    },
    benefit: {
      en: "₹6,000 per year, paid in three equal instalments directly to your bank account.",
      hi: "₹6,000 प्रति वर्ष, तीन बराबर किश्तों में सीधे बैंक खाते में।",
    },
    whereToApply: {
      en: "pmkisan.gov.in or your nearest Common Service Centre (CSC).",
      hi: "pmkisan.gov.in पर या नज़दीकी CSC केंद्र पर।",
    },
    documents: ["aadhaar", "bank", "land", "mobile"],
    rule: {
      all: [
        { field: "occupation", op: "eq", value: "farmer" },
        { field: "land", op: "in", value: ["small", "medium"] },
      ],
    },
    softFields: ["land"],
  },
  {
    id: "ayushman-bharat",
    ministry: "Ministry of Health & Family Welfare",
    sourceUrl: "https://pmjay.gov.in",
    name: {
      en: "Ayushman Bharat PM-JAY",
      hi: "आयुष्मान भारत पीएम-जेएवाई",
      bn: "আয়ুষ্মান ভারত পিএম-জেএওয়াই",
      ta: "ஆயுஷ்மான் பாரத் பிஎம்-ஜேஏஒய்",
      te: "ఆయుష్మాన్ భారత్ పీఎం-జేఏవై",
      mr: "आयुष्मान भारत पीएम-जेएवाय",
    },
    summary: {
      en: "Free health cover for eligible low-income families.",
      hi: "पात्र निम्न आय परिवारों के लिए मुफ़्त स्वास्थ्य कवर।",
    },
    benefit: {
      en: "Up to ₹5,00,000 per family per year for hospital treatment at empanelled hospitals.",
      hi: "पैनल में शामिल अस्पतालों में इलाज के लिए प्रति परिवार प्रति वर्ष ₹5,00,000 तक।",
    },
    whereToApply: {
      en: "Check eligibility at pmjay.gov.in or visit any empanelled hospital / CSC.",
      hi: "pmjay.gov.in पर पात्रता जाँचें या किसी पैनल अस्पताल / CSC पर जाएँ।",
    },
    documents: ["aadhaar", "ration", "mobile"],
    rule: {
      any: [
        { field: "ration", op: "in", value: ["bpl", "aay"] },
        { field: "income", op: "lt", value: 100000 },
      ],
    },
    softFields: ["ration", "income"],
  },
  {
    id: "ujjwala",
    ministry: "Ministry of Petroleum & Natural Gas",
    sourceUrl: "https://pmuy.gov.in",
    name: {
      en: "PM Ujjwala Yojana (LPG Connection)",
      hi: "पीएम उज्ज्वला योजना (एलपीजी कनेक्शन)",
      bn: "পিএম উজ্জ্বলা যোজনা",
      ta: "பிஎம் உஜ்ஜ்வலா யோஜனா",
      te: "పీఎం ఉజ్జ్వల యోజన",
      mr: "पीएम उज्ज्वला योजना",
    },
    summary: {
      en: "Free LPG connection for women from low-income households.",
      hi: "कम आय वाले परिवारों की महिलाओं के लिए मुफ़्त एलपीजी कनेक्शन।",
    },
    benefit: {
      en: "Free LPG connection, first refill and stove, plus subsidy on refills.",
      hi: "मुफ़्त एलपीजी कनेक्शन, पहला रिफिल और चूल्हा, और रिफिल पर सब्सिडी।",
    },
    whereToApply: {
      en: "Apply at any LPG distributor or online at pmuy.gov.in.",
      hi: "किसी भी एलपीजी वितरक पर या pmuy.gov.in पर आवेदन करें।",
    },
    documents: ["aadhaar", "bank", "ration", "photo"],
    rule: {
      all: [
        { field: "gender", op: "eq", value: "female" },
        {
          any: [
            { field: "ration", op: "in", value: ["bpl", "aay"] },
            { field: "income", op: "lt", value: 100000 },
          ],
        },
      ],
    },
  },
  {
    id: "post-matric-sc",
    ministry: "Ministry of Social Justice & Empowerment",
    sourceUrl: "https://scholarships.gov.in",
    name: {
      en: "Post-Matric Scholarship (SC)",
      hi: "पोस्ट-मैट्रिक छात्रवृत्ति (SC)",
      bn: "পোস্ট-ম্যাট্রিক বৃত্তি (SC)",
      ta: "பிந்தைய பள்ளி உதவித்தொகை (SC)",
      te: "పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ (SC)",
      mr: "पोस्ट-मॅट्रिक शिष्यवृत्ती (SC)",
    },
    summary: {
      en: "Scholarship for SC students after class 10 to help with course fees and living.",
      hi: "कक्षा 10 के बाद SC छात्रों के लिए फीस और खर्च में सहायता।",
    },
    benefit: {
      en: "Course fees, maintenance allowance, and study material support.",
      hi: "कोर्स फीस, रखरखाव भत्ता और अध्ययन सामग्री सहायता।",
    },
    whereToApply: {
      en: "National Scholarship Portal — scholarships.gov.in",
      hi: "राष्ट्रीय छात्रवृत्ति पोर्टल — scholarships.gov.in",
    },
    documents: ["aadhaar", "bank", "income", "caste", "school", "photo"],
    rule: {
      all: [
        { field: "category", op: "eq", value: "sc" },
        { field: "occupation", op: "eq", value: "student" },
        { field: "income", op: "lt", value: 250000 },
      ],
    },
  },
  {
    id: "ignoaps",
    ministry: "Ministry of Rural Development",
    sourceUrl: "https://nsap.nic.in",
    name: {
      en: "Indira Gandhi National Old Age Pension (IGNOAPS)",
      hi: "इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन",
      bn: "ইন্দিরা গান্ধী জাতীয় বার্ধক্য পেনশন",
      ta: "இந்திரா காந்தி தேசிய முதியோர் ஓய்வூதியம்",
      te: "ఇందిరా గాంధీ జాతీయ వృద్ధాప్య పింఛను",
      mr: "इंदिरा गांधी राष्ट्रीय वृद्धापकाळ निवृत्तीवेतन",
    },
    summary: {
      en: "Monthly pension for people aged 60+ from BPL families.",
      hi: "बीपीएल परिवारों के 60 वर्ष या अधिक आयु के लोगों के लिए मासिक पेंशन।",
    },
    benefit: {
      en: "₹200/month (60–79 yrs) and ₹500/month (80+ yrs), paid to your bank account.",
      hi: "₹200/माह (60–79 वर्ष) और ₹500/माह (80+ वर्ष), बैंक खाते में।",
    },
    whereToApply: {
      en: "Block/Panchayat office or nsap.nic.in via CSC.",
      hi: "ब्लॉक/पंचायत कार्यालय या CSC के माध्यम से nsap.nic.in पर।",
    },
    documents: ["aadhaar", "bank", "age", "ration"],
    rule: {
      all: [
        { field: "age", op: "gte", value: 60 },
        {
          any: [
            { field: "ration", op: "in", value: ["bpl", "aay"] },
            { field: "income", op: "lt", value: 100000 },
          ],
        },
      ],
    },
  },
  {
    id: "pmay-g",
    ministry: "Ministry of Rural Development",
    sourceUrl: "https://pmayg.nic.in",
    name: {
      en: "PM Awas Yojana – Gramin",
      hi: "पीएम आवास योजना – ग्रामीण",
      bn: "পিএম আবাস যোজনা – গ্রামীণ",
      ta: "பிஎம் ஆவாஸ் யோஜனா – கிராமம்",
      te: "పీఎం ఆవాస్ యోజన – గ్రామీణ",
      mr: "पीएम आवास योजना – ग्रामीण",
    },
    summary: {
      en: "Financial assistance to build a pucca house for rural low-income families.",
      hi: "ग्रामीण निम्न आय परिवारों के लिए पक्का घर बनाने में सहायता।",
    },
    benefit: {
      en: "₹1.20 lakh (plain areas) or ₹1.30 lakh (hilly/difficult areas) plus MGNREGA labour support.",
      hi: "₹1.20 लाख (मैदानी) या ₹1.30 लाख (पहाड़ी) साथ ही MGNREGA श्रम सहायता।",
    },
    whereToApply: {
      en: "Gram Panchayat / Block office; check status at pmayg.nic.in",
      hi: "ग्राम पंचायत / ब्लॉक कार्यालय; स्थिति pmayg.nic.in पर देखें।",
    },
    documents: ["aadhaar", "bank", "ration", "income"],
    rule: {
      all: [
        { field: "income", op: "lt", value: 300000 },
        {
          any: [
            { field: "ration", op: "in", value: ["bpl", "aay"] },
            { field: "occupation", op: "in", value: ["farmer", "self", "unemployed"] },
          ],
        },
      ],
    },
    softFields: ["ration"],
  },
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry",
  "Chandigarh", "Andaman & Nicobar", "Dadra & Nagar Haveli and Daman & Diu", "Lakshadweep",
];
