import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, ImageUp, Sparkles, RotateCcw, HeartPulse, Sun, Hand, Droplet, PencilLine, ScanLine } from 'lucide-react';
import { api } from '../lib/api';
import { compressImage } from '../lib/image';
import { uid } from '../lib/utils';
import { useApp } from '../store/useApp';
import { Button, PageHeader, Badge } from '../components/ui';
import { FoodItemsEditor } from '../components/FoodItems';
import { AllergyAlert, SaveToLog } from '../components/FoodDialogs';

const TIPS = [
  { icon: Sun, text: 'Shoot from above in good light with the whole plate visible.' },
  { icon: Hand, text: 'Put a spoon or your hand in the shot for scale.' },
  { icon: Droplet, text: "Add a hint about oil, ghee or sugar the camera can't see." },
  { icon: PencilLine, text: 'You can edit every item before it’s logged.' },
];

export default function Scan() {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [image, setImage] = useState(null); // { dataUrl, thumb }
  const [hint, setHint] = useState('');
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const demoMode = useApp((s) => s.settings.demoMode);

  const loadSample = async () => {
    try {
      const blob = await (await fetch('/demo-meal.svg')).blob();
      await pick(new File([blob], 'demo-meal.svg', { type: 'image/svg+xml' }));
      setImage((img) => img && { ...img, sample: true });
    } catch {
      toast.error('Could not load the sample photo');
    }
  };

  const pick = async (file) => {
    if (!file) return;
    try {
      setImage(await compressImage(file));
      setResult(null);
      setItems([]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await api.analyzeImage({ image: image.dataUrl, hint: hint || undefined, sample: image.sample });
      if (!res.isFood) {
        toast.error(res.notes ? `No food detected: ${res.notes}` : 'No food detected in this photo.');
        return;
      }
      setResult(res);
      setItems(res.items.map((i) => ({ ...i, id: uid() })));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setItems([]);
    setHint('');
  };

  return (
    <div>
      <PageHeader icon={ScanLine} title="Scan food" subtitle="Snap or upload a photo. A free vision model estimates the calories and macros." />

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {!image ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
              className={`card flex flex-col items-center gap-5 !border-2 border-dashed px-5 py-12 text-center transition sm:py-16 ${
                dragging ? '!border-brand-500 !bg-brand-50 scale-[1.01] dark:!bg-brand-500/10' : '!border-slate-300 dark:!border-slate-700'
              }`}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 opacity-40 blur-2xl" />
                <div className="relative rounded-3xl bg-gradient-to-br from-brand-500 to-accent-600 p-5 text-white shadow-glow">
                  <Camera className="h-9 w-9" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold">Take a photo of your meal</p>
                <p className="muted text-sm">or drag &amp; drop an image here</p>
              </div>
              <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <button className="btn-primary" onClick={() => cameraRef.current.click()}>
                  <Camera className="h-4 w-4" /> Use camera
                </button>
                <button className="btn-secondary" onClick={() => galleryRef.current.click()}>
                  <ImageUp className="h-4 w-4" /> Upload photo
                </button>
                {demoMode && (
                  <button className="btn-secondary" onClick={loadSample}>
                    <Sparkles className="h-4 w-4" /> Try sample meal
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                <img src={image.dataUrl} alt="Your meal" className="max-h-96 w-full object-contain" />
                {loading && (
                  <div className="absolute inset-0 bg-brand-500/10" aria-hidden>
                    <div className="absolute inset-x-0 h-1 animate-scan bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_16px_4px_rgb(52_211_153/0.6)]" />
                  </div>
                )}
              </div>
              <input
                className="input"
                placeholder="Optional hint, e.g. 'homemade, cooked in 1 tsp ghee'"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={analyze} loading={loading}>
                  <Sparkles className="h-4 w-4" /> {loading ? 'Analysing…' : result ? 'Analyse again' : 'Analyse nutrition'}
                </Button>
                <button className="btn-secondary" onClick={reset} aria-label="Choose another photo">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          {result ? (
            <div className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{result.dish}</h2>
                  {result.notes && <p className="muted text-sm">{result.notes}</p>}
                </div>
                <Badge tone={result.healthScore >= 7 ? 'green' : result.healthScore >= 4 ? 'amber' : 'red'}>
                  <HeartPulse className="h-3.5 w-3.5" /> Health {Math.round(result.healthScore)}/10
                </Badge>
              </div>
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < Math.round(result.healthScore)
                        ? result.healthScore >= 7
                          ? 'bg-brand-500'
                          : result.healthScore >= 4
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <p className="muted text-xs">Check the AI&apos;s guesses and fix names or portions before saving.</p>
              <FoodItemsEditor items={items} onChange={setItems} />
              <AllergyAlert items={items} />
              <SaveToLog
                key={result.dish}
                items={items.filter((i) => i.name.trim())}
                source="photo"
                thumb={image?.thumb}
                dish={result.dish}
                onSaved={reset}
              />
              {result.model && <p className="muted text-center text-xs">Analysed with {result.model}</p>}
            </div>
          ) : (
            <div className="card">
              <p className="section-title mb-4">Tips for better estimates</p>
              <ul className="space-y-3 text-sm">
                {TIPS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="icon-tile h-8 w-8">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="muted pt-1.5">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
