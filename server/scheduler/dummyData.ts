/**
 * Dummy Data — Stores and Employees
 *
 * Realistic profiles for prototype testing.
 * 5 stores (3 NYC, 1 LA, 1 DC), ~8-10 employees each.
 * Mix of ages, exempt/non-exempt, tipped, minors.
 */

import type { StoreLocation, EmployerProfile, EmployeeProfile } from "./types.js";

// ═══════════════════════════════════════════════════════════════════
// STORES
// ═══════════════════════════════════════════════════════════════════

export const STORES: StoreLocation[] = [
  {
    id: "nyc-times-sq",
    name: "NYC — Times Square",
    state: "NY",
    city: "New York",
    county: "New York",
    country: "US",
  },
  {
    id: "nyc-brooklyn",
    name: "NYC — Brooklyn",
    state: "NY",
    city: "New York",
    county: "Kings",
    country: "US",
  },
  {
    id: "nyc-harlem",
    name: "NYC — Harlem",
    state: "NY",
    city: "New York",
    county: "New York",
    country: "US",
  },
  {
    id: "la-downtown",
    name: "LA — Downtown",
    state: "CA",
    city: "Los Angeles",
    county: "Los Angeles",
    country: "US",
  },
  {
    id: "dc-dupont",
    name: "DC — Dupont Circle",
    state: "DC",
    city: "Washington",
    country: "US",
  },
];

// ═══════════════════════════════════════════════════════════════════
// EMPLOYER (same company across all stores)
// ═══════════════════════════════════════════════════════════════════

export const EMPLOYER: EmployerProfile = {
  totalEmployees: 2400,
  totalEmployeesAtLocation: 30,
  industryTag: "fast_food",
  annualGrossSales: 85_000_000,
};

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEES — grouped by store
// ═══════════════════════════════════════════════════════════════════

export const EMPLOYEES: Record<string, EmployeeProfile[]> = {
  "nyc-times-sq": [
    {
      id: "nyc1-001", name: "Marcus Johnson", age: 32,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 24,
    },
    {
      id: "nyc1-002", name: "Aisha Williams", age: 28,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 18,
    },
    {
      id: "nyc1-003", name: "Tyler Chen", age: 16,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 3,
    },
    {
      id: "nyc1-004", name: "Sofia Rodriguez", age: 17,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 8,
    },
    {
      id: "nyc1-005", name: "David Park", age: 45,
      exemptStatus: "exempt", hourlyRate: 35.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 60,
    },
    {
      id: "nyc1-006", name: "Jasmine Brown", age: 22,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 12,
    },
    {
      id: "nyc1-007", name: "Kevin O'Brien", age: 35,
      exemptStatus: "non_exempt", hourlyRate: 17.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 36, unionMember: true,
    },
    {
      id: "nyc1-008", name: "Maria Santos", age: 41,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 48,
    },
  ],

  "nyc-brooklyn": [
    {
      id: "nyc2-001", name: "James Wilson", age: 29,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 14,
    },
    {
      id: "nyc2-002", name: "Destiny Harris", age: 16,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 2,
    },
    {
      id: "nyc2-003", name: "Roberto Diaz", age: 38,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 30,
    },
    {
      id: "nyc2-004", name: "Priya Patel", age: 25,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 9,
    },
    {
      id: "nyc2-005", name: "Chris Thompson", age: 42,
      exemptStatus: "exempt", hourlyRate: 33.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 72,
    },
    {
      id: "nyc2-006", name: "Angela Kim", age: 31,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 20,
    },
    {
      id: "nyc2-007", name: "Malik Jefferson", age: 17,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 5,
    },
    {
      id: "nyc2-008", name: "Sarah Mitchell", age: 26,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 15,
    },
  ],

  "nyc-harlem": [
    {
      id: "nyc3-001", name: "DeAndre Washington", age: 34,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 28,
    },
    {
      id: "nyc3-002", name: "Lisa Chang", age: 27,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 11,
    },
    {
      id: "nyc3-003", name: "Jayden Moore", age: 15,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 1,
    },
    {
      id: "nyc3-004", name: "Nicole Adams", age: 39,
      exemptStatus: "exempt", hourlyRate: 34.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 55,
    },
    {
      id: "nyc3-005", name: "Omar Hassan", age: 23,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 7,
    },
    {
      id: "nyc3-006", name: "Brittany Taylor", age: 30,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 22,
    },
    {
      id: "nyc3-007", name: "Ethan Rivera", age: 17,
      exemptStatus: "non_exempt", hourlyRate: 16.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 4,
    },
    {
      id: "nyc3-008", name: "Fatima Ali", age: 44,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 60, unionMember: true,
    },
  ],

  "la-downtown": [
    {
      id: "la-001", name: "Carlos Mendez", age: 33,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 26,
    },
    {
      id: "la-002", name: "Samantha Lee", age: 24,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 10,
    },
    {
      id: "la-003", name: "Brandon Nguyen", age: 16,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 2,
    },
    {
      id: "la-004", name: "Rachel Foster", age: 37,
      exemptStatus: "exempt", hourlyRate: 38.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 48,
    },
    {
      id: "la-005", name: "Darnell Jackson", age: 21,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 6,
    },
    {
      id: "la-006", name: "Emily Tran", age: 29,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 18,
    },
    {
      id: "la-007", name: "Miguel Hernandez", age: 17,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 4,
    },
    {
      id: "la-008", name: "Ashley Williams", age: 40,
      exemptStatus: "non_exempt", hourlyRate: 20.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 36,
    },
  ],

  "dc-dupont": [
    {
      id: "dc-001", name: "Terrence Brooks", age: 31,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 20,
    },
    {
      id: "dc-002", name: "Hannah Goldstein", age: 26,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 13,
    },
    {
      id: "dc-003", name: "Zoe Patterson", age: 16,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 3,
    },
    {
      id: "dc-004", name: "Andre Williams", age: 43,
      exemptStatus: "exempt", hourlyRate: 36.00,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 65,
    },
    {
      id: "dc-005", name: "Mia Chen", age: 23,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 8,
    },
    {
      id: "dc-006", name: "Jordan Taylor", age: 35,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 30,
    },
    {
      id: "dc-007", name: "Amara Okafor", age: 17,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      isSchoolEnrolled: true, tenureMonths: 5,
    },
    {
      id: "dc-008", name: "Ryan Murphy", age: 28,
      exemptStatus: "non_exempt", hourlyRate: 17.50,
      tippedStatus: "not_tipped", jobCategory: "food_service",
      tenureMonths: 16,
    },
  ],
};

/**
 * Get all employees across all stores (flat list with store ID attached).
 */
export function getAllEmployees(): (EmployeeProfile & { storeId: string })[] {
  const all: (EmployeeProfile & { storeId: string })[] = [];
  for (const [storeId, employees] of Object.entries(EMPLOYEES)) {
    for (const emp of employees) {
      all.push({ ...emp, storeId });
    }
  }
  return all;
}
