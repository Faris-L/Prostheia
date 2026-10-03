"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Box,
  CheckCheck,
  CircleDot,
  ClipboardCheck,
  Focus,
  Layers3,
  Move3D,
  Rotate3D,
  Ruler,
  ScanLine,
} from "lucide-react";
import { LanguageToggle } from "@/components/language-toggle";
import { DentalPreview, ProstheiaMark } from "@/components/prostheia-mark";
import { useI18n } from "@/lib/i18n";
import styles from "./landing-page.module.css";

const english = {
  nav: ["Product", "Practice", "Free Lab", "Workflows"],
  signIn: "Sign in",
  start: "Get started",
  eyebrow: "A place to learn by doing",
  title: "Dental CAD practice, built around the way you learn.",
  intro:
    "Prostheia is a browser-based educational CAD environment. Follow guided exercises in Practice, then explore realistic synthetic workflows in Free Lab.",
  cta: "Start practicing",
  secondary: "Explore the workspace",
  note: "Designed for learning dental prosthetics workflows, at your own pace.",
  previewLabel: "Shared CAD workspace · preview",
  previewMode: "Synthetic training geometry",
  previewObject: "Upper jaw · digital model",
  previewTools: ["Select", "Move", "Rotate", "Sculpt", "Measure"],
  previewFooter: "Practice and Free Lab use the same CAD workspace",
  productEyebrow: "One workspace, two ways to learn",
  productTitle: "A guided path when you want it. Open lab time when you don’t.",
  productIntro:
    "Both modes work in the same browser CAD environment, with synthetic educational scenarios and tools for shaping and inspecting dental models.",
  practiceTitle: "Practice",
  practiceBody:
    "Structured lessons move through ordered steps, progressive hints, and reference views. Design Check gives feedback against each exercise’s configured educational criteria.",
  practiceMeta: "Guided lessons · step by step",
  practiceSteps: ["Required steps", "Progressive hints", "Reference modes"],
  labTitle: "Free Lab",
  labBody:
    "Work independently without Practice step gating. Start from a scenario, import your own model, open a blank workspace, or choose a random training case.",
  labMeta: "Scenario · Import My Case · Blank · Random",
  cadEyebrow: "The tools are part of the lesson",
  cadTitle: "Work with dental geometry, not a mock-up of a CAD tool.",
  cadBody:
    "Orbit, pan and zoom around a model. Transform and edit meshes, sculpt surfaces, draw curves, take measurements, and inspect geometry with section, thickness, contact, proximity, undercut, and deviation tools.",
  cadPill: "Browser-based CAD",
  cadPill2: "CAD geometry runs in your browser",
  toolMove: "Transform",
  toolInspect: "Inspect",
  toolCurve: "Curves & measurements",
  toolExport: "Import & export",
  workflowEyebrow: "Learning workflows",
  workflowTitle: "From foundations to removable prosthetics and beyond.",
  workflowIntro:
    "Practice spans restorative, denture, model, splint, articulator, and implant exercises. Each scenario is educational and uses synthetic geometry.",
  workflows: [
    "CAD Foundations",
    "Crown",
    "Bridge",
    "Inlay · Onlay · Veneer",
    "Complete Denture",
    "Partial Denture",
    "Bite Splint",
    "Digital Model",
    "Virtual Articulator",
    "Implant Practice",
  ],
  learningEyebrow: "Check, understand, continue",
  learningTitle: "Feedback that points to the next step.",
  learningIntro:
    "Design Check evaluates the criteria configured for an exercise and returns concrete feedback. Results and progress help you review completed work and continue learning.",
  loop: ["Practice", "Design Check", "Results", "Progress"],
  loopNote: "A learning record across exercises and skills",
  disclaimer:
    "Prostheia is educational practice software. It is not for diagnosis, treatment planning, surgical planning, or manufacturing approval. Imported models are not clinically assessed.",
  finalEyebrow: "Learn by making",
  finalTitle: "Build familiarity with digital dental workflows.",
  finalIntro:
    "Start with a guided lesson or find your own way around the shared CAD workspace.",
  finalCta: "Create an account",
  footerNote: "Educational software · synthetic training scenarios",
  previewAlt: "Illustration of a synthetic dental arch in the Prostheia workspace preview",
  languageLabel: "Language",
  stepLabel: "Practice guidance",
};

const serbian: typeof english = {
  nav: ["Proizvod", "Practice", "Free Lab", "Postupci"],
  signIn: "Prijava",
  start: "Započnite",
  eyebrow: "Učenje kroz praktičan rad",
  title: "Vežbajte dentalni CAD kroz učenje koje prati vaš način rada.",
  intro:
    "Prostheia je edukativno CAD okruženje u pregledaču. Pratite vođene vežbe u režimu Practice, a zatim samostalno istražujte realistične sintetičke postupke u Free Lab-u.",
  cta: "Započnite vežbanje",
  secondary: "Istražite radni prostor",
  note: "Za učenje protetskih dentalnih postupaka, tempom koji vam odgovara.",
  previewLabel: "Zajednički CAD radni prostor · prikaz",
  previewMode: "Sintetička geometrija za vežbu",
  previewObject: "Gornja vilica · digitalni model",
  previewTools: ["Izbor", "Pomeranje", "Rotacija", "Oblikovanje", "Merenje"],
  previewFooter: "Practice i Free Lab koriste isti CAD radni prostor",
  productEyebrow: "Jedan radni prostor, dva načina učenja",
  productTitle: "Vođeni koraci kada vam odgovaraju. Samostalan rad u laboratoriji kada želite.",
  productIntro:
    "Oba režima koriste isto CAD okruženje u pregledaču, sa sintetičkim edukativnim scenarijima i alatima za oblikovanje i proveru dentalnih modela.",
  practiceTitle: "Practice",
  practiceBody:
    "Strukturisane lekcije vode kroz obavezne korake, postepene savete i referentne prikaze. Provera dizajna daje povratne informacije prema edukativnim kriterijumima postavljenim za vežbu.",
  practiceMeta: "Vođene lekcije · korak po korak",
  practiceSteps: ["Obavezni koraci", "Postepeni saveti", "Referentni prikazi"],
  labTitle: "Free Lab",
  labBody:
    "Radite samostalno, bez obaveznih koraka iz režima Practice. Počnite od scenarija, uvezite sopstveni model, otvorite prazan radni prostor ili izaberite nasumičnu vežbu.",
  labMeta: "Scenario · Uvezi moj slučaj · Prazan · Nasumično",
  cadEyebrow: "Alati su deo učenja",
  cadTitle: "Rad sa dentalnom geometrijom, u stvarnom CAD okruženju.",
  cadBody:
    "Rotirajte, pomerajte i uvećavajte prikaz modela. Transformišite i menjajte mreže, oblikujte površine, crtajte krive i merite. Pregledajte presek, debljinu, kontakte, blizinu, podminirana područja i odstupanja.",
  cadPill: "CAD u pregledaču",
  cadPill2: "Geometrija se obrađuje u pregledaču",
  toolMove: "Transformacije",
  toolInspect: "Provera",
  toolCurve: "Kriva i merenja",
  toolExport: "Uvoz i izvoz",
  workflowEyebrow: "Postupci za učenje",
  workflowTitle: "Od osnova do mobilne protetike i složenijih postupaka.",
  workflowIntro:
    "Vežbe obuhvataju restauracije, proteze, modele, udlage, artikulator i implantate. Svaki scenario je edukativan i koristi sintetičku geometriju.",
  workflows: [
    "Osnove CAD-a",
    "Krunica",
    "Most",
    "Inlej · Onlej · Faseta",
    "Totalna proteza",
    "Parcijalna proteza",
    "Okluzalna udlaga",
    "Digitalni model",
    "Virtuelni artikulator",
    "Vežbe sa implantatima",
  ],
  learningEyebrow: "Proverite, razumite, nastavite",
  learningTitle: "Povratne informacije koje pomažu da izaberete sledeći korak.",
  learningIntro:
    "Provera dizajna ocenjuje kriterijume podešene za vežbu i prikazuje konkretne povratne informacije. Rezultati i napredak pomažu vam da pregledate urađeno i nastavite učenje.",
  loop: ["Practice", "Design Check · provera", "Rezultati", "Napredak"],
  loopNote: "Evidencija učenja kroz vežbe i veštine",
  disclaimer:
    "Prostheia je edukativni softver za vežbanje. Nije namenjen dijagnostici, planiranju lečenja, hirurgije niti odobrenju izrade. Uvezeni modeli se klinički ne procenjuju.",
  finalEyebrow: "Učenje kroz izradu",
  finalTitle: "Upoznajte se sa digitalnim dentalnim postupcima.",
  finalIntro:
    "Započnite vođenu lekciju ili samostalno istražite zajednički CAD radni prostor.",
  finalCta: "Kreirajte nalog",
  footerNote: "Edukativni softver · sintetički scenariji za vežbu",
  previewAlt: "Prikaz sintetičkog zubnog luka u radnom prostoru Prostheia",
  languageLabel: "Jezik",
  stepLabel: "Smernice za Practice",
};

const toolIcons = [Move3D, Rotate3D, Ruler, ScanLine];

export function LandingPage() {
  const { locale } = useI18n();
  const copy = locale === "sr" ? serbian : english;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={locale === "sr" ? "Prostheia — početna strana" : "Prostheia home"}>
            <ProstheiaMark className={styles.brandMark} />
            <span className={styles.brandText}>
              <span>Prostheia</span>
              <small>Digital Dental Studio</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label={copy.languageLabel === "Language" ? "Main navigation" : "Glavna navigacija"}>
            {copy.nav.map((item, index) => (
              <a key={item} href={["#product", "#practice", "#free-lab", "#workflows"][index]}>
                {item}
              </a>
            ))}
          </nav>
          <div className={styles.actions}>
            <LanguageToggle />
            <Link href="/login" className={styles.signIn}>{copy.signIn}</Link>
            <Link href="/signup" className={styles.headerCta}>{copy.start}</Link>
          </div>
        </div>
        <nav className={styles.mobileNav} aria-label={locale === "sr" ? "Navigacija proizvoda" : "Product navigation"}>
          {copy.nav.map((item, index) => (
            <a key={item} href={["#product", "#practice", "#free-lab", "#workflows"][index]}>{item}</a>
          ))}
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><span />{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className={styles.lead}>{copy.intro}</p>
          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryButton}>{copy.cta}<ArrowRight aria-hidden="true" /></Link>
            <a href="#product" className={styles.secondaryButton}>{copy.secondary}<ArrowDownRight aria-hidden="true" /></a>
          </div>
          <p className={styles.heroNote}><CircleDot aria-hidden="true" />{copy.note}</p>
        </div>

        <div className={styles.preview} aria-label={copy.previewLabel}>
          <div className={styles.previewTop}>
            <div className={styles.windowDots} aria-hidden="true"><i /><i /><i /></div>
            <span className={styles.previewTopLabel}><ProstheiaMark className={styles.previewMark} />{copy.previewLabel}</span>
            <span className={styles.previewTag}><span />{copy.previewMode}</span>
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewRail} aria-hidden="true">
              {[Layers3, Move3D, Rotate3D, Focus, Ruler].map((Icon, index) => <span key={index} className={index === 0 ? styles.activeTool : ""}><Icon /></span>)}
            </div>
            <div className={styles.previewCanvas}>
              <div className={styles.canvasTopline}><span>{copy.previewObject}</span><span>3D</span></div>
              <div className={styles.dentalArt}><DentalPreview label={copy.previewAlt} /></div>
              <span className={styles.axisMark} aria-hidden="true"><i /><i /><i /></span>
              <span className={styles.canvasScale} aria-hidden="true" />
            </div>
            <div className={styles.previewInspector}>
              <p>{locale === "sr" ? "ALATI" : "TOOLS"}</p>
              {copy.previewTools.map((tool, index) => <span key={tool} className={index === 0 ? styles.selectedTool : ""}>{tool}</span>)}
            </div>
          </div>
          <div className={styles.previewBottom}><span><span className={styles.statusDot} />{copy.previewFooter}</span><span>PROSTHEIA · CAD</span></div>
        </div>
      </section>

      <div className={styles.factStrip}>
        <span><Box aria-hidden="true" />{locale === "sr" ? "Zajednički CAD radni prostor" : "Shared CAD workspace"}</span>
        <span><ClipboardCheck aria-hidden="true" />{locale === "sr" ? "Vođeno Practice učenje" : "Guided Practice"}</span>
        <span><ScanLine aria-hidden="true" />{locale === "sr" ? "Nezavisni Free Lab" : "Independent Free Lab"}</span>
      </div>

      <section className={`${styles.section} ${styles.productSection}`} id="product">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{copy.productEyebrow}</p>
          <h2>{copy.productTitle}</h2>
          <p>{copy.productIntro}</p>
        </div>
        <div className={styles.modeGrid}>
          <article className={`${styles.modeCard} ${styles.practiceCard}`} id="practice">
            <div className={styles.cardIcon}><ClipboardCheck aria-hidden="true" /></div>
            <div className={styles.modeLabel}>{copy.practiceMeta}</div>
            <h3>{copy.practiceTitle}</h3>
            <p>{copy.practiceBody}</p>
            <div className={styles.lessonSteps} aria-label={copy.stepLabel}>
              {copy.practiceSteps.map((feature, index) => <span key={feature} className={index === 0 ? styles.currentStep : ""}><i>{index === 0 ? "✓" : `0${index + 1}`}</i><b>{feature}</b></span>)}
            </div>
          </article>
          <article className={`${styles.modeCard} ${styles.labCard}`} id="free-lab">
            <div className={styles.cardIcon}><ScanLine aria-hidden="true" /></div>
            <div className={styles.modeLabel}>{copy.labMeta}</div>
            <h3>{copy.labTitle}</h3>
            <p>{copy.labBody}</p>
            <div className={styles.labModes}>
              {(locale === "sr" ? ["Scenario", "Uvezi moj slučaj", "Prazan radni prostor", "Nasumičan slučaj"] : ["Scenario", "Import My Case", "Blank Workspace", "Random Case"]).map((mode, index) => <span key={mode}>{["01", "02", "03", "04"][index]}<b>{mode}</b></span>)}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.cadSection}>
        <div className={styles.cadInner}>
          <div className={styles.cadCopy}>
            <p className={styles.eyebrow}>{copy.cadEyebrow}</p>
            <h2>{copy.cadTitle}</h2>
            <p>{copy.cadBody}</p>
            <div className={styles.cadPills}><span>{copy.cadPill}</span><span>{copy.cadPill2}</span></div>
          </div>
          <div className={styles.toolGrid}>
            {[copy.toolMove, copy.toolInspect, copy.toolCurve, copy.toolExport].map((name, index) => {
              const Icon = toolIcons[index];
              return <div className={styles.toolItem} key={name}><Icon aria-hidden="true" /><span>{name}</span><CheckCheck aria-hidden="true" className={styles.toolCheck} /></div>;
            })}
            <div className={styles.analysisList}>
              {[
                locale === "sr" ? "Presek i debljina" : "Section & thickness",
                locale === "sr" ? "Kontakt i blizina" : "Contact & proximity",
                locale === "sr" ? "Podminirana područja" : "Undercut",
                locale === "sr" ? "Odstupanje" : "Deviation",
              ].map((label) => <span key={label}><i />{label}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.workflowSection}`} id="workflows">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{copy.workflowEyebrow}</p>
          <h2>{copy.workflowTitle}</h2>
          <p>{copy.workflowIntro}</p>
        </div>
        <div className={styles.workflowGrid}>
          {copy.workflows.map((workflow, index) => <div className={styles.workflowItem} key={workflow}><span>{String(index + 1).padStart(2, "0")}</span><b>{workflow}</b><ArrowRight aria-hidden="true" /></div>)}
        </div>
        <p className={styles.workflowNote}><CircleDot aria-hidden="true" />{locale === "sr" ? "Vežbe sa implantatima koriste sintetičke modele i nisu za hirurško planiranje." : "Implant exercises use synthetic models and are not for surgical planning."}</p>
      </section>

      <section className={styles.feedbackSection}>
        <div className={styles.feedbackCopy}>
          <p className={styles.eyebrow}>{copy.learningEyebrow}</p>
          <h2>{copy.learningTitle}</h2>
          <p>{copy.learningIntro}</p>
        </div>
        <div className={styles.learningLoop}>
          <div className={styles.loopSteps}>
            {copy.loop.map((step, index) => <div key={step} className={styles.loopStep}><span className={styles.loopNumber}>0{index + 1}</span><b>{step}</b>{index < copy.loop.length - 1 && <ArrowRight aria-hidden="true" />}</div>)}
          </div>
          <div className={styles.progressCard}>
            <div className={styles.progressIcon}><ClipboardCheck aria-hidden="true" /></div>
            <div><b>{copy.loopNote}</b><span>{locale === "sr" ? "Rezultati · lekcije · oblasti veština" : "Results · lessons · skill areas"}</span></div>
            <div className={styles.progressBars} aria-hidden="true"><i /><i /><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <aside className={styles.disclaimer}><CircleDot aria-hidden="true" /><p>{copy.disclaimer}</p></aside>

      <section className={styles.finalCta}>
        <div><p className={styles.eyebrow}>{copy.finalEyebrow}</p><h2>{copy.finalTitle}</h2><p>{copy.finalIntro}</p></div>
        <Link href="/signup" className={styles.primaryButton}>{copy.finalCta}<ArrowRight aria-hidden="true" /></Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}><ProstheiaMark className={styles.brandMark} /><span className={styles.brandText}><span>Prostheia</span><small>Digital Dental Studio</small></span></Link>
        <span>{copy.footerNote}</span>
        <div><Link href="/login">{copy.signIn}</Link><Link href="/signup">{copy.start}</Link></div>
      </footer>
    </main>
  );
}
