/**
 * Profile type definitions for cvgen.
 *
 * The profile is the single source of truth for candidate data.
 * AI must never modify it - only read, rank, and summarize from it.
 */

/**
 * Contact information.
 */
export interface Contact {
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Social media and professional profile links.
 */
export interface Social {
  github?: string;
  linkedin?: string;
  gitlab?: string;
  x?: string;
  stackoverflow?: string;
  portfolio?: string;
  website?: string;
}

/**
 * A single achievement within an experience or project.
 */
export interface Achievement {
  id: string;
  description: string;
  skills: string[];
  technologies: string[];
  tags: string[];
}

/**
 * Work experience entry.
 */
export interface Experience {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  summary?: string;
  achievements: string[];
  skills: string[];
  technologies: string[];
  projects: string[];
}

/**
 * Project entry.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  url?: string;
  repository?: string;
  technologies: string[];
  skills: string[];
  achievements: string[];
}

/**
 * Education entry.
 */
export interface Education {
  school: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  achievements: string[];
  skills: string[];
}

/**
 * Certification entry.
 */
export interface Certification {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  url?: string;
  skills: string[];
}

/**
 * Complete candidate profile.
 *
 * This is the single source of truth for all candidate data.
 * Every field is optional at the top level to allow partial profiles,
 * but validation enforces minimum required fields for generation.
 */
export interface Profile {
  name: string;
  headline?: string;
  summary?: string;
  contact: Contact;
  social?: Social;
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
  projects?: Project[];
  certifications?: Certification[];
  languages?: string[];
}
