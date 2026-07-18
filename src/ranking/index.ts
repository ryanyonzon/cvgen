/**
 * Ranking engine for cvgen.
 */

import type { Profile } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { ExtractedKeywords, RankingResult } from "./types.js";
import { ExperienceRanker } from "./experience.js";
import { SkillRanker } from "./skills.js";
import { ProjectRanker } from "./projects.js";
import { EducationRanker } from "./education.js";
import { CertificationRanker } from "./certifications.js";

export class RankingEngine {
  private readonly experienceRanker: ExperienceRanker;
  private readonly skillRanker: SkillRanker;
  private readonly projectRanker: ProjectRanker;
  private readonly educationRanker: EducationRanker;
  private readonly certificationRanker: CertificationRanker;

  constructor() {
    this.experienceRanker = new ExperienceRanker();
    this.skillRanker = new SkillRanker();
    this.projectRanker = new ProjectRanker();
    this.educationRanker = new EducationRanker();
    this.certificationRanker = new CertificationRanker();
  }

  public rankAll(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankingResult {
    const experience = this.experienceRanker.rank(profile, job, keywords);
    const skills = this.skillRanker.groupSkills(profile, job, keywords);
    const projects = this.projectRanker.rank(profile, job, keywords);
    const education = this.educationRanker.rank(profile, job, keywords);
    const certifications = this.certificationRanker.rank(
      profile,
      job,
      keywords,
    );

    return { experience, skills, projects, education, certifications };
  }

  public getRankers() {
    return {
      experience: this.experienceRanker,
      skills: this.skillRanker,
      projects: this.projectRanker,
      education: this.educationRanker,
      certifications: this.certificationRanker,
    };
  }
}

export { ExperienceRanker } from "./experience.js";
export { SkillRanker, ExperienceSkillRanker } from "./skills.js";
export { ProjectRanker } from "./projects.js";
export { EducationRanker } from "./education.js";
export { CertificationRanker } from "./certifications.js";
export type {
  RankedItem,
  ExtractedKeywords,
  RankingResult,
  RankedSkillGroup,
} from "./types.js";
