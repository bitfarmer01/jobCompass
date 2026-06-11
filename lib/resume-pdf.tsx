// Server-only — never import this file in client components.
// @react-pdf/renderer is excluded from the webpack bundle via serverExternalPackages.
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { GeneratedResumeContent, Profile } from "@/types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#111111",
  },
  // Header
  header: {
    flexDirection: "column",  // explicit — never rely on default to prevent inheritance edge cases
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 1.15,  // override the page's 1.4 lineHeight — prevents descenders from
                       // inflating the layout box and crowding the contact row below
    marginBottom: 10,  // 10pt clears the 22pt font's descenders (j, y, g, p, q extend ~5-7pt)
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  contactItem: {
    fontSize: 9,
    color: "#444444",
    marginRight: 12,
  },
  // Section
  section: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "0.5pt solid #888888",
    paddingBottom: 2,
    marginBottom: 6,
  },
  // Summary
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  // Experience
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  roleTitleCompany: {
    fontSize: 10,
    fontWeight: "bold",
  },
  roleDates: {
    fontSize: 9,
    color: "#555555",
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
    color: "#333333",
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  roleBlock: {
    marginBottom: 8,
  },
  // Education
  eduRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eduMain: {
    fontSize: 10,
  },
  eduYear: {
    fontSize: 9,
    color: "#555555",
  },
  // Skills
  skillsText: {
    fontSize: 10,
    lineHeight: 1.4,
  },
});

function formatDateRange(startDate: string, endDate: string, current: boolean): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Dates are expected as YYYY-MM (the form enforces it via type="month"), but
  // AI-extracted values are only prompt-enforced — anything that isn't a parseable
  // YYYY[-MM[-DD]] renders verbatim instead of misparsing into garbage.
  const fmt = (d: string): string => {
    const m = /^(\d{4})(?:-(\d{1,2}))?(?:-\d{1,2})?$/.exec(d.trim());
    if (!m) return d.trim();
    const [, year, month] = m;
    if (!month) return year;
    const idx = parseInt(month, 10) - 1;
    return idx >= 0 && idx < 12 ? `${months[idx]} ${year}` : year;
  };
  const start = fmt(startDate);
  const end = current ? "Present" : fmt(endDate);
  return [start, end].filter(Boolean).join(" – ");
}

type Props = {
  profile: Profile;
  content: GeneratedResumeContent;
};

// Renders the resume to a PDF buffer. Element construction lives here (not in
// the API route) so routes stay .ts and JSX is never built inside a try/catch
// where render errors couldn't be caught anyway (react-hooks/error-boundaries).
export function renderResumePdfBuffer(
  profile: Profile,
  content: GeneratedResumeContent,
): Promise<Buffer> {
  return renderToBuffer(<ResumePDF profile={profile} content={content} />);
}

export function ResumePDF({ profile, content }: Props) {
  const {
    full_name,
    email,
    phone,
    location,
    linkedin_url,
    portfolio_url,
    education,
    skills,
  } = profile;

  const contactItems = [
    email,
    phone,
    location,
    linkedin_url,
    portfolio_url,
  ].filter(Boolean);

  const hasEducation =
    education?.length > 0 &&
    (education[0].degree || education[0].field || education[0].institution);
  const hasSkills = skills?.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{full_name}</Text>
          <View style={styles.contactRow}>
            {contactItems.map((item, i) => (
              <Text key={i} style={styles.contactItem}>
                {item}
              </Text>
            ))}
          </View>
        </View>

        {/* Summary */}
        {content.summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Summary</Text>
            <Text style={styles.summaryText}>{content.summary}</Text>
          </View>
        ) : null}

        {/* Experience */}
        {content.workExperience?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Experience</Text>
            {content.workExperience.map((role, i) => (
              <View key={i} style={styles.roleBlock}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitleCompany}>
                    {[role.jobTitle, role.company].map((s) => s?.trim()).filter(Boolean).join(", ")}
                  </Text>
                  <Text style={styles.roleDates}>
                    {formatDateRange(role.startDate, role.endDate, role.current)}
                  </Text>
                </View>
                {role.bullets?.map((bullet, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Education */}
        {hasEducation ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            {education.map((edu, i) => (
              <View key={i} style={styles.eduRow}>
                <Text style={styles.eduMain}>
                  {[edu.degree, edu.field, edu.institution].filter(Boolean).join(" · ")}
                </Text>
                {edu.graduation_year ? (
                  <Text style={styles.eduYear}>{edu.graduation_year}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Skills */}
        {hasSkills ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.skillsText}>{skills.join(", ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
