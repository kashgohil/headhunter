import type { ResumeSnapshot } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const templateStyles = {
  classic: { page: "font-sans", header: "border-b-2 border-foreground pb-4 text-center", heading: "border-b border-foreground/30 pb-1 text-xs font-bold uppercase tracking-[0.16em]" },
  modern: { page: "border-l-[10px] border-primary font-sans", header: "pb-5 text-left", heading: "text-xs font-bold uppercase tracking-[0.2em] text-primary" },
  compact: { page: "font-sans text-[10px] leading-[1.35]", header: "border-b border-foreground pb-3 text-left", heading: "text-[10px] font-bold uppercase tracking-[0.14em]" },
  minimal: { page: "font-sans", header: "pb-7 text-left", heading: "text-xs font-semibold tracking-tight text-muted-foreground" },
};

export function ResumePreview({ snapshot }: { snapshot: ResumeSnapshot }) {
  const style = templateStyles[snapshot.template];
  const profileItems = snapshot.profileItems.filter((item) => item.kind !== "education");
  const education = snapshot.profileItems.filter((item) => item.kind === "education");
  const sections: Record<string, React.ReactNode> = {
    summary: snapshot.summary ? <section key="summary"><h3 className={style.heading}>Profile</h3><p className="mt-2 leading-relaxed">{snapshot.summary}</p></section> : null,
    experience: snapshot.experiences.length ? <section key="experience"><h3 className={style.heading}>Experience</h3><div className="mt-3 space-y-4">{snapshot.experiences.map((experience) => <article key={experience.id}><div className="flex items-baseline justify-between gap-4"><div><h4 className="font-bold">{experience.title}</h4><p>{experience.company}{experience.location ? ` · ${experience.location}` : ""}</p></div><span className="shrink-0 font-mono text-[9px] text-muted-foreground">{experience.startDate}–{experience.endDate || "Present"}</span></div>{experience.bullets.length ? <ul className="mt-2 space-y-1 pl-4">{experience.bullets.map((bullet) => <li key={bullet.id} className="list-disc pl-1 leading-relaxed">{bullet.text}</li>)}</ul> : null}</article>)}</div></section> : null,
    projects: profileItems.length ? <section key="projects"><h3 className={style.heading}>Selected work</h3><div className="mt-3 space-y-2">{profileItems.map((item) => <div key={item.id}><h4 className="font-bold">{item.title}{item.organization ? ` · ${item.organization}` : ""}</h4><p className="mt-0.5 leading-relaxed">{item.description}</p></div>)}</div></section> : null,
    skills: snapshot.skills.length ? <section key="skills"><h3 className={style.heading}>Skills</h3><p className="mt-2 leading-relaxed">{snapshot.skills.join(" · ")}</p></section> : null,
    education: education.length ? <section key="education"><h3 className={style.heading}>Education</h3><div className="mt-2">{education.map((item) => <p key={item.id}><span className="font-bold">{item.title}</span>{item.organization ? ` · ${item.organization}` : ""}</p>)}</div></section> : null,
  };
  return (
    <div className={cn("aspect-[8.5/11] w-full overflow-hidden bg-white p-[7%] text-[11px] leading-[1.45] text-neutral-900 shadow-[0_14px_45px_rgba(25,24,22,0.12)]", style.page)}>
      <header className={style.header}><h2 className="break-words text-2xl font-bold tracking-[-0.04em]">{snapshot.candidate?.name || "Candidate identity unavailable"}</h2><p className="mt-1 break-words text-xs text-neutral-500">{[snapshot.candidate?.email, snapshot.candidate?.phone, snapshot.candidate?.location].filter(Boolean).join(" · ")}</p>{snapshot.candidate?.website ? <p className="mt-1 break-all text-xs text-neutral-500">{snapshot.candidate.website}</p> : null}</header>
      <div className={cn("mt-5 space-y-5", snapshot.template === "compact" && "mt-3 space-y-3")}>{snapshot.sectionOrder.map((section) => sections[section])}</div>
    </div>
  );
}
