import { useEffect, useState } from 'react';
import type { SlideType } from '../App';
import { getGameMeta, labelForKey } from '../lib/gameMeta';

interface StructuredJsonEditorProps {
  gameType: SlideType;
  data: unknown;
  onChange: (newData: unknown) => void;
}

type EditorTab = 'structured' | 'raw';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function JsonNodeEditor({
  label,
  value,
  path,
  onPatch,
}: {
  label: string;
  value: unknown;
  path: string;
  onPatch: (path: string, value: unknown) => void;
}) {
  const [open, setOpen] = useState(true);

  if (label === '_note') {
    if (!isPlainObject(value)) return null;
    return (
      <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-100/90 space-y-1">
        <p className="font-semibold text-blue-200">Guida rapida</p>
        {Object.entries(value).map(([k, v]) => (
          <p key={k}>
            <span className="text-blue-300">{labelForKey(k)}:</span> {String(v)}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    const isPrimitiveArray = value.every((v) => typeof v !== 'object' || v === null);
    return (
      <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="mb-2 border border-white/5 rounded-lg overflow-hidden">
        <summary className="px-3 py-2 bg-white/5 cursor-pointer text-sm font-medium flex justify-between">
          <span>{label}</span>
          <span className="text-white/40 text-xs">{value.length} elementi</span>
        </summary>
        <div className="p-3 space-y-2 bg-black/20">
          {isPrimitiveArray ? (
            <textarea
              className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-xs font-mono text-gray-200 min-h-[60px]"
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  onPatch(path, JSON.parse(e.target.value));
                } catch {
                  /* ignore while typing */
                }
              }}
              spellCheck={false}
            />
          ) : (
            value.map((item, i) => (
              <JsonNodeEditor
                key={`${path}.${i}`}
                label={`Elemento ${i + 1}`}
                value={item}
                path={`${path}.${i}`}
                onPatch={onPatch}
              />
            ))
          )}
        </div>
      </details>
    );
  }

  if (isPlainObject(value)) {
    return (
      <details open={open} className="mb-2 border border-white/5 rounded-lg overflow-hidden">
        <summary className="px-3 py-2 bg-white/5 cursor-pointer text-sm font-medium">{label}</summary>
        <div className="p-3 space-y-2 bg-black/20 pl-4 border-l-2 border-white/10 ml-2">
          {Object.entries(value).map(([key, child]) => (
            <JsonNodeEditor
              key={`${path}.${key}`}
              label={labelForKey(key)}
              value={child}
              path={`${path}.${key}`}
              onPatch={onPatch}
            />
          ))}
        </div>
      </details>
    );
  }

  const strVal = value === null || value === undefined ? '' : String(value);

  return (
    <label className="block mb-2">
      <span className="text-[11px] uppercase tracking-wide text-white/50 mb-1 block">{label}</span>
      <input
        type="text"
        className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100 focus:border-[#d24726] focus:outline-none"
        value={strVal}
        onChange={(e) => {
          let next: unknown = e.target.value;
          if (typeof value === 'number') next = Number(e.target.value);
          if (typeof value === 'boolean') next = e.target.value === 'true';
          onPatch(path, next);
        }}
      />
    </label>
  );
}

function setAtPath(root: unknown, path: string, value: unknown): unknown {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) return value;
  const clone = JSON.parse(JSON.stringify(root));
  let cursor: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const idx = Number(key);
    if (Array.isArray(cursor)) cursor = cursor[idx];
    else if (isPlainObject(cursor)) cursor = cursor[key];
  }
  const last = parts[parts.length - 1];
  const lastIdx = Number(last);
  if (Array.isArray(cursor)) cursor[lastIdx] = value;
  else if (isPlainObject(cursor)) cursor[last] = value;
  return clone;
}

export default function StructuredJsonEditor({ gameType, data, onChange }: StructuredJsonEditorProps) {
  const [tab, setTab] = useState<EditorTab>('structured');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const meta = getGameMeta(gameType);

  useEffect(() => {
    setJsonText(JSON.stringify(data, null, 2));
    setError(null);
  }, [data, gameType]);

  const handleRawChange = (text: string) => {
    setJsonText(text);
    try {
      onChange(JSON.parse(text));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'JSON non valido');
    }
  };

  const handlePatch = (path: string, value: unknown) => {
    onChange(setAtPath(data, path, value));
  };

  if (!isPlainObject(data) && !Array.isArray(data)) {
    return (
      <p className="text-sm text-white/50">Nessun dato da modificare per questo gioco.</p>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="mb-3">
        <p className="text-sm font-semibold text-white">{meta?.title ?? gameType}</p>
        <p className="text-xs text-white/50 mt-0.5">{meta?.description}</p>
      </div>

      <div className="flex gap-1 mb-3 p-0.5 bg-black/30 rounded-lg">
        <button
          type="button"
          onClick={() => setTab('structured')}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium ${
            tab === 'structured' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          Modifica guidata
        </button>
        <button
          type="button"
          onClick={() => setTab('raw')}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium ${
            tab === 'raw' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          JSON avanzato
        </button>
      </div>

      {tab === 'structured' ? (
        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {isPlainObject(data) &&
            Object.entries(data).map(([key, val]) => (
              <JsonNodeEditor
                key={key}
                label={labelForKey(key)}
                value={val}
                path={key}
                onPatch={handlePatch}
              />
            ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs p-2 rounded mb-2">
              {error}
            </div>
          )}
          <textarea
            className={`flex-1 w-full bg-gray-950 border ${error ? 'border-red-500' : 'border-gray-700'} rounded p-3 font-mono text-xs text-gray-300 focus:outline-none focus:border-[#d24726] resize-none min-h-[200px]`}
            value={jsonText}
            onChange={(e) => handleRawChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
