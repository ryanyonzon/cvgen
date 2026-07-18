/**
 * Certification ranking engine.
 *
 * Ranks certifications by relevance to the target job using
 * skill overlap and job description keyword matching.
 */

import type { Profile, Certification } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { Ranker, RankedItem, ExtractedKeywords } from "./types.js";

/**
 * Certification ranker.
 *
 * Scores certifications based on how well their skills align
 * with the job requirements.
 */
export class CertificationRanker implements Ranker<Certification> {
  public readonly name = "CertificationRanker";

  /**
   * Rank certifications by relevance.
   */
  public rank(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<Certification>[] {
    const certifications = profile.certifications ?? [];

    if (certifications.length === 0) {
      return [];
    }

    const jobContent = job.content.toLowerCase();
    const requiredSkills =
      keywords?.requiredSkills.map((s) => s.toLowerCase()) ?? [];
    const preferredSkills =
      keywords?.preferredSkills.map((s) => s.toLowerCase()) ?? [];

    const ranked = certifications.map((cert) => {
      const reasons: string[] = [];
      let score = 0;

      // Match certification skills against job requirements
      const certSkills = (cert.skills ?? []).map((s) => s.toLowerCase());

      // Required skill matches
      const requiredMatches = requiredSkills.filter((req) =>
        certSkills.some((cs) => cs.includes(req) || req.includes(cs)),
      );
      score += requiredMatches.length * 15;

      if (requiredMatches.length > 0) {
        reasons.push(
          `Certification covers required skills: ${requiredMatches.slice(0, 3).join(", ")}`,
        );
      }

      // Preferred skill matches
      const preferredMatches = preferredSkills.filter((pref) =>
        certSkills.some((cs) => cs.includes(pref) || pref.includes(cs)),
      );
      score += preferredMatches.length * 10;

      if (preferredMatches.length > 0) {
        reasons.push(
          `Certification covers preferred skills: ${preferredMatches.slice(0, 3).join(", ")}`,
        );
      }

      // Certification name in job description
      const lowerName = cert.name.toLowerCase();
      const nameInJob = jobContent.includes(lowerName);
      if (nameInJob) {
        score += 20;
        reasons.push("Certification explicitly mentioned in job description");
      }

      // Issuer recognition
      const lowerIssuer = cert.issuer.toLowerCase();
      const issuerInJob = jobContent.includes(lowerIssuer);
      if (issuerInJob) {
        score += 10;
        reasons.push("Certification issuer recognized in job description");
      }

      return {
        item: cert,
        score: Math.min(100, score),
        reasons,
      };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }
}
