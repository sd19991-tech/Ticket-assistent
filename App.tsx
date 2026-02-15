
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ITTicket } from './types';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [ticket, setTicket] = useState<ITTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTicket = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analysiere folgende Problembeschreibung und erstelle ein strukturiertes IT-Ticket: "${input}"`,
        config: {
          systemInstruction: `Du bist ein erfahrener IT-Service-Desk-Mitarbeiter. Erstelle aus unstrukturierten Nutzereingaben professionelle Tickets. 
          
          DEINE ZUSATZAUFGABE:
          Prüfe die Eingabe auf Vollständigkeit basierend auf den 5 W-Fragen:
          1. WER ist betroffen? (Nutzer/Abteilung)
          2. WO tritt das Problem auf? (Ort/Gebäude/Systemumgebung)
          3. WAS ist genau das Problem? (Detaillierte Fehlerbeschreibung)
          4. WIE VIELE sind betroffen? (Einzelner Nutzer vs. ganze Abteilung)
          5. WARUM/WANN ist es passiert? (Auslöser oder Zeitpunkt)

          Falls Informationen fehlen, generiere konkrete, freundliche Rückfragen für das Feld 'missingInfoQuestions'.
          Die Sprache ist Deutsch. 
          Der CI-Typ sollte spezifisch sein (z.B. Laptop, Drucker, Software-Name). 
          Die Kategorie sollte in das Schema 'Hardware/Software/Netzwerk > Sub-Kategorie' passen.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Ein prägnanter, professioneller Titel für das Ticket." },
              category: { type: Type.STRING, description: "Die ITSM-Kategorie des Falls." },
              ciType: { type: Type.STRING, description: "Der Typ des betroffenen Configuration Items." },
              symptoms: { type: Type.STRING, description: "Eine detaillierte Beschreibung der Symptome." },
              missingInfoQuestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Liste von konkreten Rückfragen zu fehlenden Informationen (Wer, Wo, Was, Wie viele, Warum)." 
              }
            },
            required: ["title", "category", "ciType", "symptoms", "missingInfoQuestions"]
          }
        },
      });

      const result = JSON.parse(response.text || '{}');
      setTicket(result);
    } catch (err) {
      console.error(err);
      setError("Fehler bei der Ticket-Generierung. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
            <i className="fas fa-ticket-alt text-blue-600"></i>
            IT Ticket Assistent
          </h1>
          <p className="text-slate-500 mt-2">Professionelle Tickets & Vollständigkeits-Check durch KI.</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Problembeschreibung / Notizen</label>
            <textarea
              className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Geben Sie hier die Problembeschreibung ein..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              onClick={generateTicket}
              disabled={loading || !input.trim()}
              className={`mt-4 w-full py-3 px-6 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                loading || !input.trim() ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch animate-spin"></i>
                  Analysiere & Generiere...
                </>
              ) : (
                <>
                  <i className="fas fa-magic"></i>
                  Ticket & Rückfragen erstellen
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {ticket && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {/* Sektion für fehlende Informationen */}
            {ticket.missingInfoQuestions && ticket.missingInfoQuestions.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-3">
                  <i className="fas fa-question-circle"></i>
                  Fehlende Informationen / Rückfragen
                </h3>
                <ul className="space-y-2">
                  {ticket.missingInfoQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-amber-900 bg-white/50 p-2 rounded border border-amber-100 group">
                      <i className="fas fa-chevron-right text-amber-400 mt-1"></i>
                      <span className="flex-1">{q}</span>
                      <button 
                        onClick={() => copyToClipboard(q)}
                        className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-600 transition-opacity"
                        title="Frage kopieren"
                      >
                        <i className="far fa-copy"></i>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-3 italic">
                  Tipp: Beantworten Sie diese Fragen, um das Ticket zu vervollständigen.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-bold text-slate-800">Strukturiertes Ticket</h2>
              <button
                onClick={() => copyToClipboard(`Titel: ${ticket.title}\nKategorie: ${ticket.category}\nCI Typ: ${ticket.ciType}\nSymptome: ${ticket.symptoms}`)}
                className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
              >
                <i className="far fa-copy mr-1"></i> Alles kopieren
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titel */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 relative group">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">Titel</span>
                <p className="text-lg font-semibold text-slate-800 pr-10">{ticket.title}</p>
                <button 
                  onClick={() => copyToClipboard(ticket.title)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 transition-colors"
                >
                  <i className="far fa-copy"></i>
                </button>
              </div>

              {/* Kategorie */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">Kategorie</span>
                <p className="text-slate-700 pr-10">{ticket.category}</p>
                <button 
                  onClick={() => copyToClipboard(ticket.category)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 transition-colors"
                >
                  <i className="far fa-copy"></i>
                </button>
              </div>

              {/* CI-Typ */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">CI Typ</span>
                <p className="text-slate-700 pr-10">{ticket.ciType}</p>
                <button 
                  onClick={() => copyToClipboard(ticket.ciType)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 transition-colors"
                >
                  <i className="far fa-copy"></i>
                </button>
              </div>

              {/* Symptom Feld */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 relative group">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">Symptom Feld</span>
                <p className="text-slate-700 whitespace-pre-wrap pr-10">{ticket.symptoms}</p>
                <button 
                  onClick={() => copyToClipboard(ticket.symptoms)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-blue-600 transition-colors"
                >
                  <i className="far fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <footer className="mt-12 text-center text-slate-400 text-sm pb-8">
        <p>&copy; {new Date().getFullYear()} IT Ticket Assistent - Powered by Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
