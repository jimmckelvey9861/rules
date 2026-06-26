import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data (order matters for foreign keys)
  await prisma.crawlerCandidate.deleteMany();
  await prisma.matrixCellStatus.deleteMany();
  await prisma.lawSourceApplicabilityVariable.deleteMany();
  await prisma.lawSource.deleteMany();
  await prisma.applicabilityVariable.deleteMany();
  await prisma.lawCategory.deleteMany();
  await prisma.jurisdiction.deleteMany();

  // ═══════════════════════════════════════════════════════════════
  // 1. JURISDICTIONS
  // ═══════════════════════════════════════════════════════════════

  const us = await prisma.jurisdiction.create({
    data: { name: "United States", type: "country", sortOrder: 0 },
  });

  const federal = await prisma.jurisdiction.create({
    data: { name: "Federal", type: "federal", parentId: us.id, sortOrder: 1 },
  });

  // Federal agencies
  const fedAgencies = ["Department of Labor", "Wage and Hour Division", "OSHA", "EEOC", "NLRB", "IRS"];
  for (let i = 0; i < fedAgencies.length; i++) {
    await prisma.jurisdiction.create({
      data: { name: fedAgencies[i], type: "federal_agency", parentId: federal.id, sortOrder: 10 + i },
    });
  }

  // States with their sub-jurisdictions
  const stateData: {
    name: string;
    abbr: string;
    agencies?: string[];
    counties?: { name: string; municipalities?: string[] }[];
    municipalities?: string[];
    specialDistricts?: string[];
    coverageRegions?: string[];
  }[] = [
    { name: "Alabama", abbr: "AL" },
    { name: "Alaska", abbr: "AK" },
    { name: "Arizona", abbr: "AZ", municipalities: ["Tucson"] },
    { name: "Arkansas", abbr: "AR" },
    {
      name: "California", abbr: "CA",
      agencies: ["Labor Commissioner / DLSE", "Civil Rights Department", "Cal/OSHA", "Employment Development Department"],
      counties: [
        { name: "Alameda County", municipalities: ["Alameda", "Berkeley", "Emeryville", "Fremont", "Hayward", "Oakland", "Richmond"] },
        { name: "Los Angeles County", municipalities: ["Los Angeles", "Malibu", "Pasadena", "Santa Monica", "West Hollywood"] },
        { name: "Marin County", municipalities: ["Novato"] },
        { name: "San Diego County", municipalities: ["San Diego"] },
        { name: "San Francisco County", municipalities: ["San Francisco"] },
        { name: "San Mateo County", municipalities: ["Belmont", "Burlingame", "Daly City", "East Palo Alto", "Foster City", "Half Moon Bay", "Menlo Park", "Redwood City", "San Carlos", "San Mateo", "South San Francisco"] },
        { name: "Santa Clara County", municipalities: ["Cupertino", "Los Altos", "Milpitas", "Mountain View", "Palo Alto", "San Jose", "Santa Clara", "Sunnyvale"] },
        { name: "Sonoma County", municipalities: ["Petaluma", "Santa Rosa", "Sonoma"] },
      ],
      coverageRegions: ["Bay Area", "Southern California"],
    },
    {
      name: "Colorado", abbr: "CO",
      counties: [
        { name: "Boulder County", municipalities: ["Boulder"] },
        { name: "Denver County", municipalities: ["Denver"] },
        { name: "Jefferson County", municipalities: ["Edgewater"] },
      ],
    },
    { name: "Connecticut", abbr: "CT" },
    { name: "Delaware", abbr: "DE" },
    {
      name: "District of Columbia", abbr: "DC",
      municipalities: ["Washington"],
    },
    { name: "Florida", abbr: "FL" },
    { name: "Georgia", abbr: "GA" },
    { name: "Hawaii", abbr: "HI" },
    { name: "Idaho", abbr: "ID" },
    {
      name: "Illinois", abbr: "IL",
      counties: [
        { name: "Cook County", municipalities: ["Chicago", "Evanston"] },
      ],
    },
    { name: "Indiana", abbr: "IN" },
    { name: "Iowa", abbr: "IA" },
    { name: "Kansas", abbr: "KS" },
    { name: "Kentucky", abbr: "KY" },
    { name: "Louisiana", abbr: "LA" },
    {
      name: "Maine", abbr: "ME",
      counties: [
        { name: "Cumberland County", municipalities: ["Portland"] },
        { name: "Knox County", municipalities: ["Rockland"] },
      ],
    },
    {
      name: "Maryland", abbr: "MD",
      counties: [
        { name: "Anne Arundel County", municipalities: ["Annapolis"] },
        { name: "Baltimore City" },
        { name: "Montgomery County" },
        { name: "Prince George's County" },
      ],
    },
    { name: "Massachusetts", abbr: "MA" },
    { name: "Michigan", abbr: "MI" },
    {
      name: "Minnesota", abbr: "MN",
      counties: [
        { name: "Hennepin County", municipalities: ["Minneapolis"] },
        { name: "Ramsey County", municipalities: ["Saint Paul"] },
      ],
    },
    { name: "Mississippi", abbr: "MS" },
    { name: "Missouri", abbr: "MO" },
    { name: "Montana", abbr: "MT" },
    { name: "Nebraska", abbr: "NE" },
    { name: "Nevada", abbr: "NV" },
    { name: "New Hampshire", abbr: "NH" },
    { name: "New Jersey", abbr: "NJ" },
    {
      name: "New Mexico", abbr: "NM",
      counties: [
        { name: "Bernalillo County", municipalities: ["Albuquerque"] },
        { name: "Dona Ana County", municipalities: ["Las Cruces"] },
        { name: "Santa Fe County", municipalities: ["Santa Fe"] },
      ],
    },
    {
      name: "New York", abbr: "NY",
      counties: [
        { name: "Bronx County" },
        { name: "Kings County" },
        { name: "Nassau County" },
        { name: "New York County" },
        { name: "Queens County" },
        { name: "Richmond County" },
        { name: "Suffolk County" },
        { name: "Westchester County" },
      ],
      municipalities: ["New York City"],
      coverageRegions: ["Long Island"],
    },
    { name: "North Carolina", abbr: "NC" },
    { name: "North Dakota", abbr: "ND" },
    { name: "Ohio", abbr: "OH" },
    { name: "Oklahoma", abbr: "OK" },
    {
      name: "Oregon", abbr: "OR",
      counties: [
        { name: "Clackamas County" },
        { name: "Multnomah County", municipalities: ["Portland"] },
        { name: "Washington County" },
      ],
      coverageRegions: ["Portland Metro Area", "Urban Counties", "Standard Counties"],
    },
    {
      name: "Pennsylvania", abbr: "PA",
      counties: [
        { name: "Philadelphia County", municipalities: ["Philadelphia"] },
      ],
    },
    { name: "Rhode Island", abbr: "RI" },
    { name: "South Carolina", abbr: "SC" },
    { name: "South Dakota", abbr: "SD" },
    { name: "Tennessee", abbr: "TN" },
    { name: "Texas", abbr: "TX" },
    { name: "Utah", abbr: "UT" },
    { name: "Vermont", abbr: "VT" },
    { name: "Virginia", abbr: "VA" },
    {
      name: "Washington", abbr: "WA",
      counties: [
        { name: "King County", municipalities: ["SeaTac", "Seattle", "Tukwila"] },
        { name: "Whatcom County", municipalities: ["Bellingham"] },
      ],
      specialDistricts: ["SeaTac Airport Employment Zone"],
    },
    { name: "West Virginia", abbr: "WV" },
    { name: "Wisconsin", abbr: "WI" },
    { name: "Wyoming", abbr: "WY" },
  ];

  // Create states and sub-jurisdictions
  const jurisdictionMap: Record<string, string> = {};
  jurisdictionMap["Federal"] = federal.id;

  let stateOrder = 100;
  for (const st of stateData) {
    const state = await prisma.jurisdiction.create({
      data: {
        name: st.name,
        type: "state",
        parentId: us.id,
        state: st.abbr,
        sortOrder: stateOrder++,
      },
    });
    jurisdictionMap[st.abbr] = state.id;
    jurisdictionMap[st.name] = state.id;

    // State agencies
    if (st.agencies) {
      for (const agency of st.agencies) {
        await prisma.jurisdiction.create({
          data: { name: agency, type: "state_agency", parentId: state.id, state: st.abbr, sortOrder: stateOrder++ },
        });
      }
    }

    // Counties and their municipalities
    if (st.counties) {
      for (const county of st.counties) {
        const countyRec = await prisma.jurisdiction.create({
          data: { name: county.name, type: "county", parentId: state.id, state: st.abbr, sortOrder: stateOrder++ },
        });
        if (county.municipalities) {
          for (const muni of county.municipalities) {
            const m = await prisma.jurisdiction.create({
              data: { name: muni, type: "municipality", parentId: countyRec.id, state: st.abbr, sortOrder: stateOrder++ },
            });
            jurisdictionMap[`${st.abbr}:${muni}`] = m.id;
          }
        }
      }
    }

    // Direct municipalities (not under a county)
    if (st.municipalities) {
      for (const muni of st.municipalities) {
        const m = await prisma.jurisdiction.create({
          data: { name: muni, type: "municipality", parentId: state.id, state: st.abbr, sortOrder: stateOrder++ },
        });
        jurisdictionMap[`${st.abbr}:${muni}`] = m.id;
      }
    }

    // Special districts
    if (st.specialDistricts) {
      for (const sd of st.specialDistricts) {
        await prisma.jurisdiction.create({
          data: { name: sd, type: "special_district", parentId: state.id, state: st.abbr, sortOrder: stateOrder++ },
        });
      }
    }

    // Coverage regions
    if (st.coverageRegions) {
      for (const cr of st.coverageRegions) {
        const c = await prisma.jurisdiction.create({
          data: { name: cr, type: "coverage_region", parentId: state.id, state: st.abbr, sortOrder: stateOrder++ },
        });
        jurisdictionMap[`${st.abbr}:${cr}`] = c.id;
      }
    }
  }

  // Tribal Nations
  const tribal = await prisma.jurisdiction.create({
    data: { name: "Tribal Nations", type: "tribal_nation", parentId: us.id, sortOrder: 9000 },
  });

  // National Coverage Regions
  const natRegions = ["Multi-State Regions", "Federal Contractor Coverage", "Railroad / Transportation Coverage", "Maritime Coverage", "Migrant / Seasonal Agricultural Worker Coverage"];
  for (let i = 0; i < natRegions.length; i++) {
    await prisma.jurisdiction.create({
      data: { name: natRegions[i], type: "coverage_region", parentId: us.id, sortOrder: 9100 + i },
    });
  }

  console.log("  ✓ Jurisdictions seeded");

  // ═══════════════════════════════════════════════════════════════
  // 2. LAW CATEGORIES
  // ═══════════════════════════════════════════════════════════════

  const categoryTree: { name: string; children: { name: string; children?: string[] }[] }[] = [
    {
      name: "1. Compensation & Pay",
      children: [
        { name: "1.1 Minimum Wage", children: ["State Minimum Wage", "Local Minimum Wage", "Industry-Specific Minimum Wage", "Small Employer Wage Rules", "Training Wage", "Youth Wage", "Seasonal Employee Wage"] },
        { name: "1.2 Tipped Compensation", children: ["Tipped Minimum Cash Wage", "Tip Credit Rules", "Tip Pooling", "Tip Sharing", "Service Charge Distribution", "Tip Notice Requirements"] },
        { name: "1.3 Overtime", children: ["Weekly Overtime", "Daily Overtime", "Double Time", "Weighted Average Overtime", "Alternative Workweek Overtime", "Seventh Day Overtime", "Salary Threshold Exemptions"] },
        { name: "1.4 Premium Pay", children: ["Split Shift Premium", "Spread of Hours Pay", "Reporting Time Pay", "Call-In Pay", "Predictability Pay", "On-Call Pay", "Hazard Pay"] },
        { name: "1.5 Compensable Time", children: ["Training Time", "Meeting Time", "Travel Time", "Waiting Time", "Sleep Time", "Preparation / Closing Time", "Remote Work Time", "Break Compensation Rules"] },
        { name: "1.6 Reimbursements & Allowances", children: ["Expense Reimbursement", "Uniform Reimbursement", "Tool / Equipment Reimbursement", "Mileage Reimbursement", "Cell Phone / Internet Reimbursement", "Meal Allowances"] },
        { name: "1.7 Equal Pay & Wage Protections", children: ["Equal Pay", "Pay Transparency", "Wage Deduction Restrictions", "Pay Frequency", "Pay Stub Requirements", "Direct Deposit Rules"] },
      ],
    },
    {
      name: "2. Scheduling & Hours",
      children: [
        { name: "2.1 Meal Breaks", children: ["Meal Break Eligibility", "Meal Break Timing", "Meal Break Duration", "Waiver Rules", "On-Duty Meal Breaks"] },
        { name: "2.2 Rest Breaks", children: ["Rest Break Eligibility", "Rest Break Frequency", "Paid Rest Break Requirements"] },
        { name: "2.3 Predictive Scheduling", children: ["Advance Schedule Notice", "Schedule Change Premiums", "Employee Consent Rules", "Right to Decline Changes", "Good Faith Estimate Requirements"] },
        { name: "2.4 Shift Structure Rules", children: ["Split Shift Restrictions", "Clopening Restrictions", "Minimum Rest Between Shifts", "Maximum Shift Length", "Consecutive Day Restrictions"] },
        { name: "2.5 Hour Limits", children: ["Maximum Daily Hours", "Maximum Weekly Hours", "Mandatory Overtime Restrictions", "Day of Rest Requirements"] },
        { name: "2.6 Availability & Flex Scheduling", children: ["Employee Availability Rights", "Part-Time Scheduling Protections", "Right to Request Flexible Scheduling"] },
      ],
    },
    {
      name: "3. Leave & Time Off",
      children: [
        { name: "3.1 Sick Leave", children: ["Paid Sick Leave", "Accrual Rules", "Carryover Rules", "Usage Restrictions", "Frontloading Rules"] },
        { name: "3.2 Family & Medical Leave", children: ["FMLA", "Paid Family Leave", "Pregnancy Leave", "Parental Leave", "Caregiver Leave"] },
        { name: "3.3 Personal Leave", children: ["Vacation Leave", "PTO Rules", "Bereavement Leave", "Jury Duty Leave", "Voting Leave", "School Activity Leave", "Organ Donor Leave", "Military Leave"] },
        { name: "3.4 Safety & Emergency Leave", children: ["Domestic Violence Leave", "Crime Victim Leave", "Emergency Response Leave", "Public Health Emergency Leave", "Quarantine / Isolation Leave"] },
        { name: "3.5 Leave Administration", children: ["Notice Requirements", "Documentation Rules", "Job Protection", "Benefit Continuation", "Return-to-Work Rules"] },
      ],
    },
    {
      name: "4. Minor Employment",
      children: [
        { name: "4.1 Hour Restrictions", children: ["Maximum Daily Hours", "Maximum Weekly Hours", "School Day Restrictions", "School Week Restrictions"] },
        { name: "4.2 Time-of-Day Restrictions", children: ["Curfew Restrictions", "Night Work Restrictions"] },
        { name: "4.3 Break Rules for Minors", children: ["Minor Meal Breaks", "Minor Rest Breaks"] },
        { name: "4.4 Work Authorization", children: ["Work Permit Requirements", "Age Verification Requirements"] },
        { name: "4.5 Restricted Occupations", children: ["Hazardous Occupation Restrictions", "Equipment Restrictions", "Industry-Specific Restrictions"] },
      ],
    },
    {
      name: "5. Hiring & Onboarding",
      children: [
        { name: "5.1 Hiring Practices", children: ["Salary History Ban", "Pay Range Disclosure", "Ban the Box", "Fair Chance Hiring", "Interview Restrictions"] },
        { name: "5.2 Background & Screening", children: ["Background Check Rules", "Credit Check Restrictions", "Drug Testing Rules", "Reference Check Requirements"] },
        { name: "5.3 Worker Classification", children: ["Independent Contractor Tests", "Employee Classification Standards", "Exempt vs Non-Exempt Classification"] },
        { name: "5.4 Employment Documentation", children: ["Offer Letter Requirements", "Required Hiring Notices", "Arbitration Agreement Restrictions", "Noncompete Restrictions", "Confidentiality Agreement Restrictions"] },
        { name: "5.5 Employment Eligibility", children: ["I-9 Requirements", "E-Verify Requirements", "Work Authorization Verification"] },
      ],
    },
    {
      name: "6. Workplace Protections",
      children: [
        { name: "6.1 Anti-Discrimination", children: ["Protected Classes", "Equal Employment Opportunity", "Retaliation Protections"] },
        { name: "6.2 Harassment Prevention", children: ["Harassment Policies", "Mandatory Training", "Complaint Procedures"] },
        { name: "6.3 Accommodation Requirements", children: ["Disability Accommodation", "Religious Accommodation", "Pregnancy Accommodation", "Lactation Accommodation"] },
        { name: "6.4 Workplace Safety", children: ["OSHA Compliance", "Heat Illness Prevention", "Workplace Violence Prevention", "Safety Training Requirements"] },
        { name: "6.5 Worker Privacy & Monitoring", children: ["Employee Monitoring Restrictions", "Biometric Privacy", "Personnel File Access", "Drug & Alcohol Testing Protections"] },
        { name: "6.6 Whistleblower Protections", children: ["Protected Reporting", "Anti-Retaliation Requirements"] },
      ],
    },
    {
      name: "7. Separation & Final Pay",
      children: [
        { name: "7.1 Final Compensation", children: ["Final Pay Timing", "PTO / Vacation Payout", "Commission Payment Rules", "Severance Rules"] },
        { name: "7.2 Separation Procedures", children: ["Termination Notice Requirements", "Exit Documentation", "Unemployment Notices", "COBRA Notices"] },
        { name: "7.3 Mass Layoffs & Closures", children: ["WARN Act", "Mini-WARN Laws", "Plant Closure Notice Requirements"] },
        { name: "7.4 Post-Employment Restrictions", children: ["Noncompete Enforcement", "Nonsolicitation Restrictions", "Confidentiality Obligations"] },
        { name: "7.5 Record Retention", children: ["Payroll Record Retention", "Personnel File Retention", "Timekeeping Record Retention"] },
      ],
    },
    {
      name: "8. Employer Coverage & Compliance",
      children: [
        { name: "8.1 Employer Threshold Rules", children: ["Employee Count Thresholds", "Revenue Thresholds", "Industry Thresholds", "Geographic Coverage Rules"] },
        { name: "8.2 Posting & Notice Requirements", children: ["Labor Law Posters", "Digital Notice Requirements", "Employee Handbook Requirements"] },
        { name: "8.3 Reporting & Filing", children: ["State Reporting Requirements", "Federal Reporting Requirements", "New Hire Reporting"] },
        { name: "8.4 Audits & Enforcement", children: ["Agency Audit Requirements", "Self-Audit Obligations", "Penalty Structures"] },
        { name: "8.5 Multi-Jurisdiction Coordination", children: ["State vs Local Preemption", "Multi-State Employment Rules", "Conflict Resolution Rules"] },
      ],
    },
    {
      name: "9. Industry-Specific Rules",
      children: [
        { name: "9.1 Restaurant & Hospitality", children: ["Tip Rules", "Predictive Scheduling", "Uniform Rules", "Meal Credit Rules"] },
        { name: "9.2 Retail", children: ["Fair Workweek Rules", "Reporting Time Rules", "Seasonal Worker Rules"] },
        { name: "9.3 Healthcare", children: ["Nurse Staffing Rules", "Mandatory Overtime Restrictions", "Patient Safety Staffing Ratios"] },
        { name: "9.4 Transportation & Logistics", children: ["Driver Hour Limits", "DOT Compliance", "Rest Period Rules"] },
        { name: "9.5 Construction", children: ["Prevailing Wage", "Safety Certification Requirements", "Apprenticeship Requirements"] },
        { name: "9.6 Agriculture", children: ["Farmworker Wage Rules", "Housing Requirements", "Migrant Worker Protections"] },
        { name: "9.7 Gig Economy & Platform Work", children: ["Independent Contractor Rules", "App-Based Worker Protections", "Earnings Guarantee Rules"] },
        { name: "9.8 Cannabis Industry", children: ["Age Restrictions", "Licensing-Related Employment Rules", "Security Staffing Requirements"] },
        { name: "9.9 Aviation", children: ["Flight Time & Duty Rules", "Rest Requirements", "Safety-Sensitive Position Rules"] },
      ],
    },
  ];

  const categoryMap: Record<string, string> = {};
  let catOrder = 0;

  for (const top of categoryTree) {
    const topRec = await prisma.lawCategory.create({
      data: { name: top.name, level: 0, sortOrder: catOrder++ },
    });
    categoryMap[top.name] = topRec.id;

    for (const section of top.children) {
      const sectionRec = await prisma.lawCategory.create({
        data: { name: section.name, parentId: topRec.id, level: 1, sortOrder: catOrder++ },
      });
      categoryMap[section.name] = sectionRec.id;

      if (section.children) {
        for (const sub of section.children) {
          const subRec = await prisma.lawCategory.create({
            data: { name: sub, parentId: sectionRec.id, level: 2, sortOrder: catOrder++ },
          });
          categoryMap[sub] = subRec.id;
        }
      }
    }
  }

  console.log("  ✓ Law categories seeded");

  // ═══════════════════════════════════════════════════════════════
  // 3. APPLICABILITY VARIABLES
  // ═══════════════════════════════════════════════════════════════

  const variableData: { path: string; name: string; category: string; description?: string }[] = [
    // Location
    { path: "location.country", name: "Country", category: "Location" },
    { path: "location.state", name: "State", category: "Location" },
    { path: "location.city", name: "City", category: "Location" },
    { path: "location.county", name: "County", category: "Location" },
    { path: "location.zip_code", name: "ZIP Code", category: "Location" },
    { path: "location.metro_area", name: "Metro Area", category: "Location" },
    { path: "location.tribal_land", name: "Tribal Land", category: "Location" },
    { path: "location.special_district", name: "Special District", category: "Location" },
    { path: "location.is_unincorporated", name: "Unincorporated Area", category: "Location" },
    { path: "location.primary_work_state", name: "Primary Work State", category: "Location" },
    { path: "location.primary_work_city", name: "Primary Work City", category: "Location" },
    { path: "location.primary_work_county", name: "Primary Work County", category: "Location" },
    { path: "location.employee_residence_state", name: "Employee Residence State", category: "Location" },
    { path: "location.employee_residence_city", name: "Employee Residence City", category: "Location" },
    { path: "location.multi_state_employer", name: "Multi-State Employer", category: "Location" },
    { path: "location.multi_jurisdiction_employee", name: "Multi-Jurisdiction Employee", category: "Location" },
    // Employer
    { path: "employer.total_employees_global", name: "Total Employees (Global)", category: "Employer" },
    { path: "employer.total_employees_us", name: "Total Employees (US)", category: "Employer" },
    { path: "employer.total_employees_state", name: "Total Employees (State)", category: "Employer" },
    { path: "employer.total_employees_city", name: "Total Employees (City)", category: "Employer" },
    { path: "employer.total_employees_at_location", name: "Total Employees (Location)", category: "Employer" },
    { path: "employer.number_of_locations", name: "Number of Locations", category: "Employer" },
    { path: "employer.annual_gross_revenue", name: "Annual Gross Revenue", category: "Employer" },
    { path: "employer.annual_gross_sales", name: "Annual Gross Sales", category: "Employer" },
    { path: "employer.is_franchisee", name: "Is Franchisee", category: "Employer" },
    { path: "employer.is_franchisor", name: "Is Franchisor", category: "Employer" },
    { path: "employer.is_chain", name: "Is Chain", category: "Employer" },
    { path: "employer.is_joint_employer", name: "Is Joint Employer", category: "Employer" },
    { path: "employer.is_staffing_agency", name: "Is Staffing Agency", category: "Employer" },
    { path: "employer.parent_company", name: "Parent Company", category: "Employer" },
    { path: "employer.has_collective_bargaining_agreement", name: "Has CBA", category: "Employer" },
    { path: "employer.is_unionized_workforce", name: "Unionized Workforce", category: "Employer" },
    { path: "employer.is_government_entity", name: "Is Government Entity", category: "Employer" },
    { path: "employer.is_federal_contractor", name: "Is Federal Contractor", category: "Employer" },
    { path: "employer.is_state_contractor", name: "Is State Contractor", category: "Employer" },
    { path: "employer.is_prevailing_wage_project", name: "Is Prevailing Wage Project", category: "Employer" },
    // Business
    { path: "business.naics_code", name: "NAICS Code", category: "Business" },
    { path: "business.industry_tags", name: "Industry Tags", category: "Business" },
    { path: "business.operates_24_hours", name: "Operates 24 Hours", category: "Business" },
    { path: "business.is_public_accommodation", name: "Is Public Accommodation", category: "Business" },
    { path: "business.is_licensed_facility", name: "Is Licensed Facility", category: "Business" },
    { path: "business.hotel_room_count", name: "Hotel Room Count", category: "Business" },
    // Employee
    { path: "employee.worker_type", name: "Worker Type", category: "Employee", description: "employee, independent_contractor, intern, apprentice, trainee" },
    { path: "employee.exemption_status", name: "Exemption Status", category: "Employee", description: "exempt or non_exempt" },
    { path: "employee.employment_status", name: "Employment Status", category: "Employee", description: "full_time, part_time, temporary, seasonal" },
    { path: "employee.union_member", name: "Union Member", category: "Employee" },
    { path: "employee.collective_bargaining_unit", name: "Collective Bargaining Unit", category: "Employee" },
    { path: "employee.probationary_status", name: "Probationary Status", category: "Employee" },
    { path: "employee.age", name: "Age", category: "Employee" },
    { path: "employee.job_title", name: "Job Title", category: "Employee" },
    { path: "employee.job_category", name: "Job Category", category: "Employee" },
    { path: "employee.role_tags", name: "Role Tags", category: "Employee" },
    { path: "employee.remote_worker", name: "Remote Worker", category: "Employee" },
    { path: "employee.hybrid_worker", name: "Hybrid Worker", category: "Employee" },
    { path: "employee.has_work_permit", name: "Has Work Permit", category: "Employee" },
    { path: "employee.is_school_enrolled", name: "Is School Enrolled", category: "Employee" },
    { path: "employee.pay_structure", name: "Pay Structure", category: "Employee", description: "hourly, salary, piece_rate, commission, daily_rate" },
    { path: "employee.regular_hourly_rate", name: "Regular Hourly Rate", category: "Employee" },
    { path: "employee.salary_weekly", name: "Salary (Weekly)", category: "Employee" },
    { path: "employee.cash_wage", name: "Cash Wage", category: "Employee" },
    { path: "employee.tip_eligible", name: "Tip Eligible", category: "Employee" },
    { path: "employee.receives_service_charges", name: "Receives Service Charges", category: "Employee" },
    { path: "employee.receives_bonus", name: "Receives Bonus", category: "Employee" },
    { path: "employee.receives_shift_differential", name: "Receives Shift Differential", category: "Employee" },
    { path: "employee.hire_date", name: "Hire Date", category: "Employee" },
    // Shift
    { path: "shift.date", name: "Shift Date", category: "Shift" },
    { path: "shift.shift_start", name: "Shift Start", category: "Shift" },
    { path: "shift.shift_end", name: "Shift End", category: "Shift" },
    { path: "shift.is_split_shift", name: "Is Split Shift", category: "Shift" },
    { path: "shift.split_shift_gap_minutes", name: "Split Shift Gap (min)", category: "Shift" },
    { path: "shift.is_on_call_shift", name: "Is On-Call Shift", category: "Shift" },
    { path: "shift.meal_period_waived", name: "Meal Period Waived", category: "Shift" },
    { path: "shift.is_school_day", name: "Is School Day", category: "Shift" },
    { path: "shift.school_in_session", name: "School In Session", category: "Shift" },
    { path: "shift.is_holiday", name: "Is Holiday", category: "Shift" },
    // Schedule
    { path: "schedule.advance_notice_days", name: "Advance Notice (days)", category: "Schedule" },
    { path: "schedule.schedule_posted_date", name: "Schedule Posted Date", category: "Schedule" },
    { path: "schedule.was_changed", name: "Schedule Was Changed", category: "Schedule" },
    { path: "schedule.change_type", name: "Change Type", category: "Schedule", description: "add, move, extend, cancel, shorten" },
    { path: "schedule.hours_added", name: "Hours Added", category: "Schedule" },
    { path: "schedule.hours_reduced", name: "Hours Reduced", category: "Schedule" },
    { path: "schedule.employer_initiated_change", name: "Employer Initiated Change", category: "Schedule" },
    { path: "schedule.employee_requested_change", name: "Employee Requested Change", category: "Schedule" },
    { path: "schedule.employee_consented", name: "Employee Consented", category: "Schedule" },
    { path: "schedule.location_changed", name: "Location Changed", category: "Schedule" },
    { path: "schedule.called_in", name: "Called In", category: "Schedule" },
    { path: "schedule.good_faith_estimate_provided", name: "Good Faith Estimate Provided", category: "Schedule" },
    // Leave
    { path: "leave.leave_type", name: "Leave Type", category: "Leave" },
    { path: "leave.reason", name: "Leave Reason", category: "Leave" },
    { path: "leave.request_date", name: "Leave Request Date", category: "Leave" },
    { path: "leave.start_date", name: "Leave Start Date", category: "Leave" },
    { path: "leave.end_date", name: "Leave End Date", category: "Leave" },
    { path: "leave.family_relationship", name: "Family Relationship", category: "Leave" },
    { path: "leave.medical_certification_provided", name: "Medical Certification Provided", category: "Leave" },
    { path: "leave.is_intermittent", name: "Is Intermittent Leave", category: "Leave" },
    { path: "leave.notice_provided", name: "Leave Notice Provided", category: "Leave" },
    { path: "leave.documentation_provided", name: "Leave Documentation Provided", category: "Leave" },
    // Separation
    { path: "termination.type", name: "Termination Type", category: "Separation", description: "voluntary, involuntary, layoff, resignation, discharge" },
    { path: "termination.date", name: "Termination Date", category: "Separation" },
    { path: "termination.reason", name: "Termination Reason", category: "Separation" },
    { path: "termination.final_pay_date", name: "Final Pay Date", category: "Separation" },
    { path: "termination.is_mass_layoff", name: "Is Mass Layoff", category: "Separation" },
    { path: "termination.notice_given", name: "Termination Notice Given", category: "Separation" },
    // Workplace Environment
    { path: "environment.temperature_f", name: "Temperature (°F)", category: "Workplace Environment" },
    { path: "environment.air_quality_index", name: "Air Quality Index", category: "Workplace Environment" },
    { path: "environment.outdoor_work", name: "Outdoor Work", category: "Workplace Environment" },
    { path: "environment.hazardous_materials", name: "Hazardous Materials", category: "Workplace Environment" },
    { path: "environment.healthcare_setting", name: "Healthcare Setting", category: "Workplace Environment" },
    // Timekeeping & Payroll
    { path: "timekeeping.clock_in_method", name: "Clock-In Method", category: "Timekeeping & Payroll" },
    { path: "timekeeping.rounding_policy", name: "Rounding Policy", category: "Timekeeping & Payroll" },
    { path: "payroll.pay_frequency", name: "Pay Frequency", category: "Timekeeping & Payroll" },
    { path: "payroll.direct_deposit_enabled", name: "Direct Deposit Enabled", category: "Timekeeping & Payroll" },
  ];

  const variableMap: Record<string, string> = {};
  for (const v of variableData) {
    const rec = await prisma.applicabilityVariable.create({ data: v });
    variableMap[v.path] = rec.id;
  }

  console.log("  ✓ Applicability variables seeded");

  // ═══════════════════════════════════════════════════════════════
  // 4. SAMPLE LAW SOURCES
  // ═══════════════════════════════════════════════════════════════

  const sampleLaws: {
    title: string;
    jurisdictionKey: string;
    categoryKey: string;
    summary: string;
    structuredText: string;
    sourceUrl: string;
    sourceAuthority: string;
    effectiveDate: string;
    status: string;
    notes?: string;
    variables: string[];
  }[] = [
    {
      title: "Federal Minimum Wage (FLSA)",
      jurisdictionKey: "Federal",
      categoryKey: "State Minimum Wage",
      summary: "The federal minimum wage is $7.25 per hour for covered nonexempt employees under the Fair Labor Standards Act.",
      structuredText: JSON.stringify({
        minimum_wage: 7.25,
        basis: "hourly",
        applies_to: "covered nonexempt employees",
        overtime_threshold_weekly: 40,
      }),
      sourceUrl: "https://www.dol.gov/agencies/whd/minimum-wage",
      sourceAuthority: "U.S. Department of Labor, Wage and Hour Division",
      effectiveDate: "2009-07-24",
      status: "active",
      notes: "Has not been raised since 2009. Many states and localities have higher minimums.",
      variables: ["location.state", "employer.total_employees_global", "employee.exemption_status", "employee.age"],
    },
    {
      title: "California Minimum Wage",
      jurisdictionKey: "CA",
      categoryKey: "State Minimum Wage",
      summary: "California's minimum wage is $16.50 per hour for all employers regardless of size, effective January 1, 2025.",
      structuredText: JSON.stringify({
        minimum_wage: 16.50,
        basis: "hourly",
        effective_date: "2025-01-01",
        applies_to: "all employees",
        fast_food_minimum_wage: 20.00,
      }),
      sourceUrl: "https://www.dir.ca.gov/dlse/faq_minimumwage.htm",
      sourceAuthority: "California Department of Industrial Relations",
      effectiveDate: "2025-01-01",
      status: "active",
      notes: "Fast food workers covered by AB 1228 have a $20/hour minimum.",
      variables: ["location.state", "employee.exemption_status", "business.naics_code", "business.industry_tags"],
    },
    {
      title: "San Francisco Minimum Wage Ordinance",
      jurisdictionKey: "CA:San Francisco",
      categoryKey: "Local Minimum Wage",
      summary: "San Francisco's minimum wage is $18.67 per hour, adjusted annually based on the Consumer Price Index.",
      structuredText: JSON.stringify({
        minimum_wage: 18.67,
        basis: "hourly",
        effective_date: "2024-07-01",
        adjustment: "annual CPI",
        applies_to: "all employees working 2+ hours per week in SF",
      }),
      sourceUrl: "https://sfgov.org/olse/minimum-wage-ordinance",
      sourceAuthority: "San Francisco Office of Labor Standards Enforcement",
      effectiveDate: "2024-07-01",
      status: "active",
      variables: ["location.city", "employee.exemption_status"],
    },
    {
      title: "Seattle Minimum Wage Ordinance",
      jurisdictionKey: "WA:Seattle",
      categoryKey: "Local Minimum Wage",
      summary: "Seattle's minimum wage is $20.76/hour for large employers (501+ employees) and $18.76/hour for small employers with tips/benefits.",
      structuredText: JSON.stringify({
        large_employer_wage: 20.76,
        small_employer_wage: 18.76,
        large_employer_threshold: 501,
        effective_date: "2025-01-01",
        adjustment: "annual CPI",
      }),
      sourceUrl: "https://www.seattle.gov/laborstandards/ordinances/minimum-wage",
      sourceAuthority: "Seattle Office of Labor Standards",
      effectiveDate: "2025-01-01",
      status: "active",
      variables: ["location.city", "employer.total_employees_global", "employee.exemption_status", "employee.tip_eligible"],
    },
    {
      title: "California Meal Break Requirements",
      jurisdictionKey: "CA",
      categoryKey: "Meal Break Eligibility",
      summary: "Employees working more than 5 hours must receive a 30-minute unpaid meal break. A second meal break is required for shifts over 10 hours.",
      structuredText: JSON.stringify({
        first_break: { threshold_hours: 5, duration_minutes: 30 },
        second_break: { threshold_hours: 10, duration_minutes: 30 },
        waiver: "First break waivable if shift ≤ 6 hours by mutual consent. Second waivable if shift ≤ 12 hours and first not waived.",
        penalty: "1 hour of pay at regular rate for each day a compliant break is not provided",
      }),
      sourceUrl: "https://www.dir.ca.gov/dlse/faq_mealperiods.htm",
      sourceAuthority: "California Department of Industrial Relations",
      effectiveDate: "2000-01-01",
      status: "active",
      variables: ["location.state", "employee.exemption_status", "shift.shift_start", "shift.shift_end", "shift.meal_period_waived"],
    },
    {
      title: "New York City Fair Workweek Law",
      jurisdictionKey: "NY:New York City",
      categoryKey: "Advance Schedule Notice",
      summary: "Fast food and retail employers must provide schedules 14 days in advance. Changes with less notice require premium pay.",
      structuredText: JSON.stringify({
        advance_notice_days: 14,
        covered_industries: ["fast_food", "retail"],
        fast_food_employer_threshold: 30,
        retail_employer_threshold: 20,
        premium: "schedule change premium of $10-$75 depending on change type and notice",
      }),
      sourceUrl: "https://www.nyc.gov/site/dca/workers/workersrights/fair-work-week-702.page",
      sourceAuthority: "NYC Department of Consumer and Worker Protection",
      effectiveDate: "2017-11-26",
      status: "active",
      notes: "Applies to fast food establishments with 30+ locations nationally and retail employers with 20+ employees.",
      variables: ["location.city", "employer.total_employees_global", "employer.number_of_locations", "business.industry_tags", "schedule.advance_notice_days", "schedule.was_changed", "schedule.change_type"],
    },
    {
      title: "Oregon Portland Metro Area Minimum Wage",
      jurisdictionKey: "OR:Portland Metro Area",
      categoryKey: "Local Minimum Wage",
      summary: "The Portland Metro Area has a higher minimum wage than the rest of Oregon: $15.95/hour effective July 1, 2024.",
      structuredText: JSON.stringify({
        minimum_wage: 15.95,
        basis: "hourly",
        effective_date: "2024-07-01",
        region: "Portland Metro Area (urban growth boundary of the Metro regional government)",
        adjustment: "annual CPI, capped at 3.5%",
      }),
      sourceUrl: "https://www.oregon.gov/boli/workers/pages/minimum-wage.aspx",
      sourceAuthority: "Oregon Bureau of Labor and Industries",
      effectiveDate: "2024-07-01",
      status: "active",
      notes: "Oregon has a three-tier minimum wage: Portland Metro, Standard Counties, and Non-Urban Counties.",
      variables: ["location.state", "location.metro_area", "employee.exemption_status"],
    },
    {
      title: "Washington State Weekly Overtime",
      jurisdictionKey: "WA",
      categoryKey: "Weekly Overtime",
      summary: "Non-exempt employees must receive 1.5x pay for hours worked over 40 in a workweek.",
      structuredText: JSON.stringify({
        weekly_threshold_hours: 40,
        overtime_multiplier: 1.5,
        applies_to: "non-exempt employees",
      }),
      sourceUrl: "https://lni.wa.gov/workers-rights/wages/overtime/",
      sourceAuthority: "Washington State Department of Labor & Industries",
      effectiveDate: "2000-01-01",
      status: "active",
      variables: ["location.state", "employee.exemption_status"],
    },
    {
      title: "California Daily Overtime",
      jurisdictionKey: "CA",
      categoryKey: "Daily Overtime",
      summary: "Non-exempt employees earn 1.5x for hours over 8 in a workday and 2x for hours over 12 in a workday.",
      structuredText: JSON.stringify({
        daily_threshold_hours: 8,
        daily_double_threshold_hours: 12,
        overtime_multiplier: 1.5,
        double_time_multiplier: 2.0,
        seventh_day: "1.5x for first 8 hours, 2x thereafter",
      }),
      sourceUrl: "https://www.dir.ca.gov/dlse/faq_overtime.htm",
      sourceAuthority: "California Department of Industrial Relations",
      effectiveDate: "2000-01-01",
      status: "active",
      variables: ["location.state", "employee.exemption_status", "shift.shift_start", "shift.shift_end"],
    },
    {
      title: "Federal FMLA",
      jurisdictionKey: "Federal",
      categoryKey: "FMLA",
      summary: "Eligible employees of covered employers may take up to 12 weeks of unpaid, job-protected leave per year for qualifying family and medical reasons.",
      structuredText: JSON.stringify({
        leave_weeks: 12,
        employer_threshold: 50,
        employee_eligibility: "12 months employed, 1,250 hours worked in prior 12 months",
        qualifying_reasons: ["birth/adoption", "serious health condition", "family member serious health condition", "military family leave"],
      }),
      sourceUrl: "https://www.dol.gov/agencies/whd/fmla",
      sourceAuthority: "U.S. Department of Labor, Wage and Hour Division",
      effectiveDate: "1993-08-05",
      status: "active",
      variables: ["employer.total_employees_global", "employee.hire_date", "leave.leave_type", "leave.family_relationship"],
    },
    {
      title: "Seattle Secure Scheduling Ordinance",
      jurisdictionKey: "WA:Seattle",
      categoryKey: "Advance Schedule Notice",
      summary: "Retail and food service employers with 500+ employees worldwide must provide 14 days advance notice of schedules.",
      structuredText: JSON.stringify({
        advance_notice_days: 14,
        covered_industries: ["retail", "food_service"],
        employer_threshold_global: 500,
        premium_model: {
          add: { type: "flat_hours", hours: 1 },
          cancel: { type: "lost_hours" },
          shorten: { type: "lost_hours" },
        },
      }),
      sourceUrl: "https://www.seattle.gov/laborstandards/ordinances/secure-scheduling",
      sourceAuthority: "Seattle Office of Labor Standards",
      effectiveDate: "2017-07-01",
      status: "active",
      notes: "Applies to retail and food service establishments with 500+ employees worldwide.",
      variables: ["location.city", "employer.total_employees_global", "business.industry_tags", "schedule.advance_notice_days", "schedule.was_changed", "schedule.change_type", "schedule.employee_consented"],
    },
    {
      title: "Federal WARN Act",
      jurisdictionKey: "Federal",
      categoryKey: "WARN Act",
      summary: "Employers with 100+ employees must provide 60 days advance notice of plant closings and mass layoffs.",
      structuredText: JSON.stringify({
        employer_threshold: 100,
        notice_days: 60,
        triggers: ["plant closing (50+ employees)", "mass layoff (500+ employees or 33% of workforce if 50+)"],
      }),
      sourceUrl: "https://www.dol.gov/agencies/eta/layoffs/warn",
      sourceAuthority: "U.S. Department of Labor, Employment and Training Administration",
      effectiveDate: "1989-02-04",
      status: "active",
      variables: ["employer.total_employees_global", "employer.total_employees_at_location", "termination.is_mass_layoff", "termination.notice_given"],
    },
  ];

  for (const law of sampleLaws) {
    const jurisdictionId = jurisdictionMap[law.jurisdictionKey];
    const lawCategoryId = categoryMap[law.categoryKey];

    if (!jurisdictionId) {
      console.warn(`  ⚠ Jurisdiction not found: ${law.jurisdictionKey}`);
      continue;
    }
    if (!lawCategoryId) {
      console.warn(`  ⚠ Category not found: ${law.categoryKey}`);
      continue;
    }

    const lawSource = await prisma.lawSource.create({
      data: {
        title: law.title,
        jurisdictionId,
        lawCategoryId,
        summary: law.summary,
        structuredText: law.structuredText,
        sourceUrl: law.sourceUrl,
        sourceAuthority: law.sourceAuthority,
        effectiveDate: new Date(law.effectiveDate),
        status: law.status,
        notes: law.notes || null,
      },
    });

    // Link applicability variables
    for (const varPath of law.variables) {
      const varId = variableMap[varPath];
      if (varId) {
        await prisma.lawSourceApplicabilityVariable.create({
          data: { lawSourceId: lawSource.id, applicabilityVariableId: varId },
        });
      }
    }
  }

  console.log("  ✓ Sample law sources seeded");

  // ═══════════════════════════════════════════════════════════════
  // 5. SAMPLE CRAWLER CANDIDATES
  // ═══════════════════════════════════════════════════════════════

  await prisma.crawlerCandidate.deleteMany();

  // Good candidate — has everything needed for promotion
  await prisma.crawlerCandidate.create({
    data: {
      title: "Denver Minimum Wage (2025)",
      sourceUrl: "https://www.denvergov.org/Government/Agencies-Departments-Offices/Auditors-Office/Denver-Minimum-Wage",
      sourceAuthority: "City and County of Denver Auditor's Office",
      guessedJurisdictionId: jurisdictionMap["CO:Denver"],
      guessedLawCategoryId: categoryMap["Local Minimum Wage"],
      summary: "Denver's minimum wage is $18.29/hour effective January 1, 2025, adjusted annually by CPI.",
      confidence: 0.85,
      status: "new",
      notes: "Crawled from Denver gov site. High confidence — official source.",
    },
  });

  // Candidate missing category — cannot be promoted without editing
  await prisma.crawlerCandidate.create({
    data: {
      title: "Chicago Paid Sick Leave Ordinance",
      sourceUrl: "https://www.chicago.gov/city/en/depts/bacp/supp_info/paid-sick-leave.html",
      sourceAuthority: "City of Chicago BACP",
      guessedJurisdictionId: jurisdictionMap["IL:Chicago"],
      guessedLawCategoryId: null, // Missing — needs human assignment
      summary: "Chicago requires employers to provide paid sick leave to employees who work at least 80 hours in any 120-day period.",
      confidence: 0.7,
      status: "new",
      notes: "Category could not be determined automatically.",
    },
  });

  // Bad candidate — spam/irrelevant
  await prisma.crawlerCandidate.create({
    data: {
      title: null,
      sourceUrl: "https://www.indeed.com/career-advice/pay-salary/minimum-wage-california",
      sourceAuthority: null,
      guessedJurisdictionId: jurisdictionMap["CA"],
      guessedLawCategoryId: categoryMap["State Minimum Wage"],
      summary: "Indeed.com career advice article about California minimum wage.",
      confidence: 0.2,
      status: "new",
      notes: "Non-authoritative source. Should be rejected.",
    },
  });

  console.log("  ✓ Sample crawler candidates seeded");
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
