import React, { useState, useEffect } from 'react';

interface JsonEditorProps {
  data: any;
  onChange: (newData: any) => void;
}

export default function JsonEditor({ data, onChange }: JsonEditorProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(data, null, 2));
    setError(null);
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);

    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch (err: any) {
      setError('Invalid JSON: ' + err.message);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 text-xs p-2 rounded mb-2 font-mono">
          {error}
        </div>
      )}
      <textarea
        className={`flex-1 w-full bg-gray-950 border ${error ? 'border-red-500' : 'border-gray-700'} rounded p-3 font-mono text-xs text-gray-300 focus:outline-none focus:border-blue-500 resize-none`}
        value={jsonText}
        onChange={handleChange}
        spellCheck={false}
      />
    </div>
  );
}
