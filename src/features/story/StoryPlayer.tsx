import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { TextTag } from 'loreline'
import { haptics } from '../../lib/haptics/haptics'
import { computeTypingDurationMs, skipCurrentWait } from '../../lib/loreline/pacing'
import {
  MANUAL_ADVANCE_TAG,
  useLoreline,
  type LorelineChoice,
  type LorelineLine,
} from '../../lib/loreline/useLoreline'
import { useStoryStore } from '../../lib/loreline/storyStore'
import { DayCurve } from './DayCurve'
import { StatusBar } from './StatusBar'
import { BALU_COLOR, LUMI_MOOD_COLORS, SOCIAL_VOICE_COLORS, isLumiMoodKey } from '../../lib/content/lumiMoods'
import { TIME_OF_DAY_MARK_COLOR_RGB, resolveTimeOfDayBucket } from '../../lib/content/timeOfDayColors'
import { resolveChoiceAccentRgb } from '../../lib/content/choiceAccent'
import { useScrollFollow } from './useScrollFollow'
import { useTypewriter } from './useTypewriter'
import './StoryPlayer.css'

// Choices, die mit diesem Emoji beginnen, sind Wissens-Choices (Konvention
// im .lor-Skript) - sie werden nicht als normaler Ghost-Button dargestellt,
// sondern als leuchtende Gluehbirne, die den Wissenstext in einem Modal zeigt.
const KNOWLEDGE_CHOICE_PREFIX = '❓'

// Der rechtliche Disclaimer-Satz traegt im .lor-Skript den Tag <disclaimer>
// (siehe NameBestaetigt) - einzige narrative Zeile, die statt der normalen
// Mark-Hervorhebung eine dezente, dauerhaft sichtbare Akzentbox bekommt.
const DISCLAIMER_TAG = 'disclaimer'

// <dark_screen> markiert eine Zeile als eigenen, ruhigen Szenenwechsel statt
// normalem Fliesstext - z.B. der Alarm-Moment in Kapitel 1 oder der Uebergang
// von "Perspektivenwechsel" in die Willkommen-Sequenz (siehe beat Szenenwechsel
// im .lor-Skript). Der Tag existierte im Skript schon vorher, war im Code
// bislang aber ein No-op.
const SCENE_SCREEN_TAG = 'dark_screen'

// Markiert im .lor-Skript ausschliesslich die allererste Wissens-Choice
// ("Was ist Diabetes??", siehe Einschaetzung-Beat) - einzige Stelle, an der
// der Choice-Text sichtbar neben dem Icon steht, damit das Glühbirnen-Konzept
// beim ersten Kontakt verstanden wird. Alle anderen Wissens-Choices bleiben
// bewusst reines Icon ohne Text.
const FIRST_KNOWLEDGE_TAG = 'first_knowledge'

// Der wiederkehrende "weiter erzaehlen"-Choice-Text aus dem .lor-Skript (11x,
// jeweils die einzige verbleibende Option nach einer bereits genutzten
// Wissens-Choice) - >>> uebernimmt genau diese Choice direkt, siehe StoryStage.
// War vorher '➡️ Weiter' (deutscher Leftover aus einem frueheren Entwurf) -
// stimmte seit der Uebersetzung ins Englische nie mit dem tatsaechlichen
// Skripttext ueberein, das automatische >>>-Uebernehmen griff dadurch nie.
const WEITER_CHOICE_TEXT = 'NEXT'

// Beim Anklicken einer Wissens-Gluehbirne "wandert" sie sichtbar in die
// Statusleiste (dorthin, wo das gesammelte Wissen tatsaechlich lebt, siehe
// StatusBar.tsx) statt an ihrer Ursprungsstelle nur gedimmt liegenzubleiben.
// Reines DOM/WAAPI statt React-State, weil der Flug ueber zwei unabhaengige
// Komponenten (Choice-Button -> StatusBar-Badge) hinweg passiert und die
// Buehne, aus der er startet, im selben Zug durch die naechste Zeile ersetzt
// wird (StoryStage remounted ueber key={entry.id}).
function flyKnowledgeIconToStatusBar(startRect: DOMRect) {
  const target = document.getElementById('status-bar-knowledge-target')
  if (!target) return

  const endRect = target.getBoundingClientRect()
  const startX = startRect.left + startRect.width / 2
  const startY = startRect.top + startRect.height / 2
  const dx = endRect.left + endRect.width / 2 - startX
  const dy = endRect.top + endRect.height / 2 - startY

  const flyer = document.createElement('span')
  flyer.className = 'story-knowledge-flyer'
  flyer.textContent = '💡'
  flyer.style.left = `${startX}px`
  flyer.style.top = `${startY}px`
  document.body.appendChild(flyer)

  const animation = flyer.animate(
    [
      { transform: 'translate(-50%, -50%) translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0 },
    ],
    // Bewusst deutlich langsamer als der erste Wurf (550ms) - die Bewegung
    // soll klar verfolgbar sein, ohne traege zu wirken. Der Badge-Pop in der
    // StatusBar (siehe pulseKnowledgeBadge) spielt erst beim Landen, damit
    // sich das Schliessen wie ein bewusstes Uebernehmen anfuehlt statt wie
    // ein generisches Dismiss.
    { duration: 950, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  )
  animation.onfinish = () => {
    flyer.remove()
    useStoryStore.getState().pulseKnowledgeBadge()
  }
  animation.oncancel = () => flyer.remove()
}

function resolveLumiMoodColor(tags: TextTag[]): string | undefined {
  const moodTag = tags.find((tag) => tag.value.startsWith('mood_'))
  if (!moodTag || !isLumiMoodKey(moodTag.value)) return undefined
  return LUMI_MOOD_COLORS[moodTag.value]
}

interface LogEntry extends LorelineLine {
  id: number
}

// Balu und Lumi sind feste Personas mit eigenem Icon statt ausgeschriebenem
// Namen (Balu immer 🩸/blau, Lumi immer ✨ in ihrer aktuellen Laune-Farbe -
// die Laune wechselt nur die FARBE, nie die Form des Icons, siehe
// LUMI_MOOD_ICONS in lumiMoods.ts fuer das davon unabhaengige Icon-SET in
// der StatusBar). Der Name bleibt als sr-only-Text erhalten, damit die
// Sprecherzuordnung fuer Screenreader klar bleibt, obwohl er visuell durchs
// Icon ersetzt wird. Chef/Robin/... sind externe Personen ohne Icon-Konvention,
// erscheinen ganz normal im Fliesstext (links, wie Balu) und behalten den
// ausgeschriebenen Namen, nur dezent eingefaerbt (siehe SOCIAL_VOICE_COLORS),
// damit sie sich untereinander unterscheiden lassen - keine eigene Zone mehr.
function CharacterName({ character, tags }: { character: string; tags: TextTag[] }) {
  if (character === 'balu') {
    return (
      <span className="story-bubble__icon" style={{ color: BALU_COLOR }} aria-hidden="true">
        🩸
      </span>
    )
  }

  if (character === 'lumi') {
    return (
      <span className="story-bubble__icon" style={{ color: resolveLumiMoodColor(tags) }} aria-hidden="true">
        ✨
      </span>
    )
  }

  const label = character.charAt(0).toUpperCase() + character.slice(1)
  return (
    <span className="story-bubble__name" style={{ color: SOCIAL_VOICE_COLORS[character] }}>
      {label}
    </span>
  )
}

// Dialogzeilen: Balu links (koerpernahe Ebene), Lumi rechts (innere,
// subjektive Stimme) - Chef/Robin/... erscheinen bewusst OHNE eigene Zone
// ganz normal im linksbuendigen Fliesstext, integriert statt als eigener
// Dialogblock (keine Bubble-/Kartenlogik mehr, siehe StoryPlayer.css). Balu/
// Lumi erscheinen sofort (kein Tippen, siehe StoryStage), Chef/Robin/...
// gleiten wie eine Chat-Nachricht von unten herein. `entrance` steuert genau
// diesen Unterschied und ist nur in der Buehne relevant (im Verlauf schon
// abgeschlossen -> "none").
function DialogueBubble({
  character,
  tags,
  text,
  entrance = 'none',
}: {
  character: string
  tags: TextTag[]
  text: string
  entrance?: 'appear' | 'slide' | 'none'
}) {
  const side = character === 'lumi' ? 'right' : 'left'
  const entranceClass = entrance === 'none' ? '' : ` story-bubble--${entrance}`
  // Balu ist die Stimme des Koerpers (Messwerte/Sensor-Charakter) - bekommt
  // dafuer bewusst die Monospace-Schrift (siehe global.css), waehrend Lumi
  // und alle anderen Dialoge bei der Lese-Serife bleiben.
  const fontClass = character === 'balu' ? ' story-bubble--monaspace' : ''
  // Icon/Name stehen bei ALLEN Personas (Balu/Lumi/Chef/Robin/...) auf
  // derselben Zeile wie ihr Text (kein Name-oben/Text-unten mehr). Nur Balu/
  // Lumi faerben zusaetzlich den GESAMTEN gesprochenen Text in ihrer Farbe -
  // Chef/Robin/... bleiben bei der normalen Textfarbe (nur der Name ist
  // dezent eingefaerbt, siehe CharacterName).
  const isPersona = character === 'balu' || character === 'lumi'
  const textColor = character === 'balu' ? BALU_COLOR : character === 'lumi' ? resolveLumiMoodColor(tags) : undefined
  const label = character.charAt(0).toUpperCase() + character.slice(1)
  return (
    <div className={`story-bubble story-bubble--${side}${entranceClass}${fontClass}`}>
      <CharacterName character={character} tags={tags} />
      {isPersona && <span className="sr-only">{label}: </span>}
      <p className="story-bubble__text" style={isPersona ? { color: textColor } : undefined}>
        {text}
      </p>
    </div>
  )
}

// Vergangene Zeilen sind per Definition fertig - reiner Text, keine
// Markierung, keine Animation, kein Hook noetig.
function HistoryLine({ entry }: { entry: LogEntry }) {
  if (entry.character) {
    return <DialogueBubble character={entry.character} tags={entry.tags} text={entry.text} />
  }
  return <p className="story-line">{entry.text}</p>
}

interface StoryStageProps {
  entry: LogEntry
  choices: LorelineChoice[] | null
  onChoose: (index: number) => void
}

// Die Buehne rendert IMMER genau die eine aktuelle Zeile (neu gemountet pro
// Eintrag ueber key={entry.id} im Aufrufer) - deshalb ist hier keine
// Registrierungs-/Ref-Indirektion fuer skip() mehr noetig wie frueher, als
// mehrere Log-Zeilen gleichzeitig im DOM standen und "die aktive" erst
// gefunden werden musste: skip() kommt direkt aus dem eigenen Hook-Aufruf
// und wird direkt im selben Render als Klick-Handler verwendet.
function StoryStage({ entry, choices, onChoose }: StoryStageProps) {
  const isNarrative = entry.character === null
  const durationMs = computeTypingDurationMs(entry.text)
  // Nur Erzaehltext tippt zeichenweise. Balu/Lumi "erscheinen" (kein Tippen),
  // Chef/Robin/... gleiten als Chat-Nachricht herein (auch kein Tippen) -
  // der Hook wird trotzdem immer aufgerufen (Rules of Hooks), sein Ergebnis
  // wird fuer Dialogzeilen einfach nicht verwendet (dort zaehlt nur, DASS
  // der volle Text sofort steht, nicht WIE er sich aufbaut).
  const { visibleText, done, skip } = useTypewriter(entry.text, durationMs)

  const ghostRef = useRef<HTMLParagraphElement>(null)
  const [reservedHeight, setReservedHeight] = useState<number | undefined>(undefined)

  // Vorab-Vermessung nur fuer Erzaehltext: der ist mehrzeilig und kann beim
  // Tippen sichtbar wachsen. Dialogzeilen sind laut Konvention immer eine
  // Zeile pro Aussage und erscheinen ohnehin vollstaendig - keine Messung noetig.
  useLayoutEffect(() => {
    if (!isNarrative) return
    const measure = () => {
      if (ghostRef.current) setReservedHeight(ghostRef.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [entry.text, isNarrative])

  const isDisclaimer = entry.tags.some((tag) => tag.value === DISCLAIMER_TAG)
  const isSceneScreen = entry.tags.some((tag) => tag.value === SCENE_SCREEN_TAG)
  // isWaiting deckt sowohl einen laufenden pauseBeat()-Delay als auch die
  // Auto-Advance-Pufferzeit nach dem Tippen ab (siehe pacing.ts) - der
  // Skip-Button soll in beiden Faellen sichtbar sein, nicht nur waehrend der
  // Typewriter selbst noch laeuft.
  const isWaiting = useStoryStore((state) => state.isWaiting)

  // >>> ersetzt den "NEXT"-Choice-Button ueberall dort, wo er im Skript
  // verwendet wird - IMMER, nicht nur wenn er die einzige aktivierte Choice
  // ist: eine parallel aktivierte Wissens-Choice ("❓ Learn more") soll NEXT
  // nicht mehr zu einem sichtbaren Text-Button neben der Gluehbirne machen
  // (fruehers Clutter: Gluehbirne UND ein separater "NEXT"-Button
  // gleichzeitig sichtbar). Bewusst NICHT generisch auf "irgendeine einzelne
  // Choice" ausgeweitet - echte narrative Erst-Entscheidungen mit nur einer
  // Option (z.B. "Ich bin bereit.") sind KEIN "Weiter" und sollen sichtbar
  // bleiben. Kein Eingriff in Loreline/useLoreline.ts noetig: >>> waehlt hier
  // einfach direkt die passende Choice aus, statt einen eigenen
  // Auto-Select-Mechanismus im Interpreter zu bauen.
  const continueChoiceIndex =
    choices?.findIndex((choice) => choice.enabled && choice.text.trim() === WEITER_CHOICE_TEXT) ?? -1
  const hasContinueChoice = continueChoiceIndex >= 0

  const showSkip = (isNarrative && !done) || isWaiting || hasContinueChoice
  const handleSkip = () => {
    if (hasContinueChoice) {
      haptics.choiceTap()
      onChoose(continueChoiceIndex)
      return
    }
    skip()
    skipCurrentWait()
  }

  // Die (nicht-erste) Wissens-Choice geht zwischen den anderen Choices unter -
  // sie zieht in einen eigenen Gluehbirnen-Slot statt in die normale
  // Choice-Liste. Die allererste Wissens-Choice (<first_knowledge>) bleibt
  // bewusst als Ausnahme inline in der Choice-Liste (siehe unten), da sie
  // dort mit sichtbarem Text das Konzept erklaert.
  const cornerKnowledgeChoiceIndex =
    choices?.findIndex(
      (choice) =>
        choice.enabled &&
        choice.text.startsWith(KNOWLEDGE_CHOICE_PREFIX) &&
        !choice.tags.some((tag) => tag.value === FIRST_KNOWLEDGE_TAG),
    ) ?? -1

  // >>> und die Gluehbirne teilen sich NICHT mehr denselben Slot (siehe
  // .story-stage__corner-actions in StoryPlayer.css) - beide koennen
  // gleichzeitig noetig sein, z.B. waehrend eine Wissens-Choice noch
  // ungenutzt daliegt UND NEXT bereits aktiviert ist.
  const showCornerKnowledge = cornerKnowledgeChoiceIndex >= 0
  // Nur "echte" Entscheidungs-Choices bleiben in der normalen Liste - Wissen
  // und NEXT werden beide gesondert behandelt (Gluehbirne/>>>) und tauchen
  // hier nie als Text auf.
  const hasPlainChoices =
    choices?.some(
      (choice, index) => choice.enabled && index !== cornerKnowledgeChoiceIndex && index !== continueChoiceIndex,
    ) ?? false
  const showInteractive = hasPlainChoices

  // 'start': die Frage bleibt oben verankert, auch wenn Frage+Choices
  // zusammen nicht in die max-height passen - siehe useScrollFollow.ts.
  const setScrollRef = useScrollFollow('start')

  return (
    <div className="story-stage">
      <div className="story-stage__scroll" ref={setScrollRef} onClick={handleSkip}>
        <div className="story-stage__scroll-content">
          {isNarrative ? (
            <div className="story-stage__text-frame" style={{ minHeight: reservedHeight }}>
              {isSceneScreen ? (
                <p className="story-line story-scene-screen">{visibleText}</p>
              ) : isDisclaimer ? (
                <p className="story-line story-disclaimer">{visibleText}</p>
              ) : (
                <p className="story-line">
                  <mark className={done ? 'story-mark story-mark--settled' : 'story-mark story-mark--typing'}>
                    {visibleText}
                  </mark>
                </p>
              )}
              <p className="story-line story-stage__ghost" ref={ghostRef} aria-hidden="true">
                {entry.text}
              </p>
            </div>
          ) : (
            entry.character && (
              <DialogueBubble
                character={entry.character}
                tags={entry.tags}
                text={entry.text}
                entrance={entry.character === 'balu' || entry.character === 'lumi' ? 'appear' : 'slide'}
              />
            )
          )}

          <div
            className={
              showInteractive ? 'story-stage__interactive story-stage__interactive--visible' : 'story-stage__interactive'
            }
          >
            <div className="story-stage__interactive-inner">
              {/* Wenn >>> die einzige Choice uebernimmt, wird der Block komplett
                  weggelassen (nicht nur optisch versteckt) - sonst bliebe die
                  "➡️ Weiter"-Choice per Tab/Screenreader trotzdem erreichbar,
                  obwohl >>> bereits dieselbe Aktion anbietet. */}
              {showInteractive && (
                <div className="story-choices">
                  {choices!
                    .map((choice, index) => ({ choice, index }))
                    // Deaktivierte Choices verschwinden komplett - gilt jetzt
                    // auch fuer Wissens-Choices: statt gedimmt liegenzubleiben,
                    // "wandert" die Gluehbirne beim Anklicken sichtbar in die
                    // Statusleiste (siehe flyKnowledgeIconToStatusBar), das
                    // Verschwinden an der Ursprungsstelle ist Teil davon. Die
                    // nicht-erste Wissens-Choice erscheint hier ebenfalls nicht -
                    // sie rendert stattdessen als eigene Gluehbirne, NEXT nie
                    // als Text - beide rendern stattdessen in
                    // .story-stage__corner-actions (siehe unten).
                    .filter(
                      ({ choice, index }) =>
                        choice.enabled && index !== cornerKnowledgeChoiceIndex && index !== continueChoiceIndex,
                    )
                    .map(({ choice, index }) => {
                      const isKnowledgeChoice = choice.text.startsWith(KNOWLEDGE_CHOICE_PREFIX)

                      if (isKnowledgeChoice) {
                        // Einzige Wissens-Choice, die hier noch inline landen
                        // kann: die allererste mit <first_knowledge> (siehe
                        // Einschaetzung-Beat) - zeigt bewusst Icon UND Text,
                        // damit das Konzept "Gluehbirne = mehr erfahren" beim
                        // ersten Kontakt klar wird, plus eine kurze Einladungs-
                        // Animation. Bleibt als einzige Ausnahme inline statt
                        // im Skip-Slot.
                        const label = choice.text.replace(KNOWLEDGE_CHOICE_PREFIX, '').trim()

                        return (
                          <button
                            key={index}
                            type="button"
                            className="story-knowledge-button story-knowledge-button--intro"
                            aria-label={label}
                            onClick={(event) => {
                              event.stopPropagation()
                              haptics.choiceTap()
                              onChoose(index)
                            }}
                          >
                            💡
                            <span>{label}</span>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={index}
                          type="button"
                          className="story-choice"
                          disabled={!choice.enabled}
                          onClick={(event) => {
                            event.stopPropagation()
                            haptics.choiceTap()
                            onChoose(index)
                          }}
                        >
                          <span className="story-choice__marker" aria-hidden="true">
                            &gt;
                          </span>
                          <span className="story-choice__label">{choice.text}</span>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {(showSkip || showCornerKnowledge) && (
        <div className="story-stage__corner-actions">
          {showCornerKnowledge && (
            <button
              type="button"
              className="story-knowledge-button story-knowledge-button--corner"
              aria-label="Mehr erfahren"
              onClick={(event) => {
                event.stopPropagation()
                haptics.choiceTap()
                onChoose(cornerKnowledgeChoiceIndex)
              }}
            >
              💡
            </button>
          )}

          {showSkip && (
            <button
              type="button"
              className={hasContinueChoice ? 'story-skip story-skip--continue' : 'story-skip'}
              onClick={handleSkip}
              aria-label={hasContinueChoice ? 'Weiter' : 'Überspringen'}
            >
              {'>>>'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Der Wissenstext erscheint als Modal statt inline im Lesefluss - kein
// Typewriter, direkt vollstaendig sichtbar (ein Popup ist ein bewusster
// Moment zum Nachlesen, kein Teil des fliessenden Erzaehltempos). Schliessen
// fuehlt sich bewusst wie ein aktives "Wissen uebernehmen" an statt wie ein
// generisches Dismiss: der "aha"-Button loest denselben Flug der Gluehbirne
// in die Statusleiste aus wie ein Klick auf die Gluehbirne selbst - und zwar
// unabhaengig davon, ob per Klick, Escape oder Backdrop geschlossen wird (alle
// drei sind gleichwertig "ich hab's gelesen"), deshalb startet der Flug immer
// von der Position des aha-Buttons, nicht vom jeweiligen Ausloeser. advance()
// lässt das .lor-Skript danach zur selben Choice-Liste zurueckkehren
// (dismissable "-" Option).
function KnowledgeModal({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const ahaButtonRef = useRef<HTMLButtonElement>(null)

  const handleDismiss = () => {
    if (ahaButtonRef.current) {
      flyKnowledgeIconToStatusBar(ahaButtonRef.current.getBoundingClientRect())
    }
    onClose()
  }

  useEffect(() => {
    ahaButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  return (
    <div className="knowledge-modal-backdrop" onClick={handleDismiss}>
      <div
        className="knowledge-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-modal-text"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="knowledge-modal-text" className="knowledge-modal__text">
          {entry.text}
        </p>
        <button ref={ahaButtonRef} type="button" className="knowledge-modal__aha" onClick={handleDismiss}>
          <span aria-hidden="true">💡</span> aha
        </button>
      </div>
    </div>
  )
}

export interface StoryPlayerProps {
  className?: string
}

export function StoryPlayer({ className }: StoryPlayerProps) {
  const { line, choices, advance, choose, finished, loading, error } = useLoreline('/story/one-day.lor')

  const [log, setLog] = useState<LogEntry[]>([])
  const nextIdRef = useRef(0)
  // Nach einer "once"-Choice (dismissable "-" Praefix im .lor-Skript, siehe
  // z.B. BasalinsulinWissen) springt der Interpreter nach dem Schliessen des
  // Modals oft direkt zurueck zu einem NEUEN Choice-Prompt, nicht zu einer
  // neuen Dialogzeile - der "neueste Log-Eintrag" bleibt also unveraendert
  // der Wissens-Eintrag. Ohne diesen expliziten Dismiss-Status wuerde das
  // Modal dadurch nie zugehen, weil es rein aus "ist der neueste Eintrag
  // Wissen?" abgeleitet wurde. Jetzt merkt sich schliessen einfach, WELCHE
  // Wissens-Zeile (per id) schon geschlossen wurde.
  const [dismissedKnowledgeId, setDismissedKnowledgeId] = useState<number | null>(null)

  useEffect(() => {
    if (!line) return
    nextIdRef.current += 1
    setLog((entries) => [...entries, { ...line, id: nextIdRef.current }])
  }, [line])

  const setHistoryRef = useScrollFollow()

  // Die Mark-Hervorhebung des Erzaehltexts folgt der zuletzt via setCurve()
  // gesetzten Uhrzeit aus dem .lor-Skript (siehe timeOfDayColors.ts) - als
  // CSS-Variable auf der Wurzel gesetzt, damit .story-mark in StoryPlayer.css
  // weiterhin selbst ueber die Deckkraft (typing/settled) entscheidet.
  const latestZeit = useStoryStore((state) => state.curvePoints[state.curvePoints.length - 1]?.zeit)
  const markColorRgb = TIME_OF_DAY_MARK_COLOR_RGB[resolveTimeOfDayBucket(latestZeit)]

  // Choices uebernehmen Lumis aktuelle Launenfarbe, falls gerade eine aktiv
  // ist, sonst dieselbe Grundfarbe wie die Erzaehltext-Markierung (siehe
  // choiceAccent.ts) - eine Quelle fuer beide CSS-Variablen statt verstreuter
  // Einzelwerte.
  const lumiMood = useStoryStore((state) => state.lumiMood)
  const choiceAccentRgb = resolveChoiceAccentRgb(lumiMood, markColorRgb)

  const rootClassName = className ? `story-player ${className}` : 'story-player'
  const rootStyle = {
    '--mark-color-rgb': markColorRgb,
    '--choice-accent-rgb': choiceAccentRgb,
  } as CSSProperties

  if (loading) {
    return (
      <div className={rootClassName}>
        <p className="story-status">Lade Geschichte…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={rootClassName}>
        <p className="story-status story-status--error">Fehler beim Laden: {error}</p>
      </div>
    )
  }

  if (finished) {
    return (
      <div className={rootClassName}>
        <p className="story-status">Ende.</p>
      </div>
    )
  }

  // <knowledge>-Zeilen erscheinen nie inline im Verlauf/auf der Buehne -
  // sie leben ausschliesslich im Modal (siehe KnowledgeModal). Das gilt
  // IMMER (auch nach dem Schliessen), waehrend die Modal-SICHTBARKEIT
  // separat davon abhaengt, ob genau diese Zeile schon dismissed wurde.
  const isKnowledgeEntry = (entry: LogEntry) => entry.tags.some((tag) => tag.value === MANUAL_ADVANCE_TAG)
  const latest = log[log.length - 1] as LogEntry | undefined
  const pendingKnowledge = latest && isKnowledgeEntry(latest) && latest.id !== dismissedKnowledgeId ? latest : null
  const stageableLog = log.filter((entry) => !isKnowledgeEntry(entry))

  const current = stageableLog[stageableLog.length - 1] as LogEntry | undefined
  const history = stageableLog.slice(0, -1)

  const handleCloseKnowledge = () => {
    if (pendingKnowledge) setDismissedKnowledgeId(pendingKnowledge.id)
    advance()
  }

  return (
    <div className={rootClassName} style={rootStyle}>
      <StatusBar />

      {/* Verlauf und Buehne bilden zusammen einen Fokusbereich, der im
          verbleibenden Freiraum zentriert wird (justify-content: center in
          StoryPlayer.css) - "das Auge schaut mittig". Die Buehne selbst hat
          eine durch Vorab-Vermessung stabile Groesse, wandert also waehrend
          des Tippens nicht - nur beim Wechsel zur naechsten Zeile oder beim
          Erscheinen von Choices aendert sich die Gesamthoehe (dafuer sanft
          animiert), nie kontinuierlich. */}
      <div className="story-body">
        {history.length > 0 && (
          <div className="story-history" ref={setHistoryRef}>
            <div className="story-history__content">
              {history.map((entry) => (
                <HistoryLine key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {current && <StoryStage key={current.id} entry={current} choices={choices} onChoose={choose} />}
      </div>

      <DayCurve />

      {pendingKnowledge && <KnowledgeModal entry={pendingKnowledge} onClose={handleCloseKnowledge} />}
    </div>
  )
}
