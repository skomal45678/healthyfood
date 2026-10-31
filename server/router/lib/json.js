// Robust JSON extraction for LLM output. Free models often wrap JSON in
// markdown fences, add prose around it, emit <think> blocks or trailing commas.

function stripNoise(text) {
  return String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json|JSON)?/g, '')
    .trim();
}

// Return the first balanced {...} or [...] substring, respecting strings.
function firstBalanced(text) {
  const start = text.search(/[{[]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function lenientParse(candidate) {
  try {
    return JSON.parse(candidate);
  } catch {
    // Remove trailing commas and JS-style comments, then retry once.
    const cleaned = candidate
      .replace(/\/\/[^\n"]*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  }
}

export function extractJson(text) {
  const cleaned = stripNoise(text);
  const candidate = firstBalanced(cleaned);
  if (!candidate) throw new Error('No JSON object found in model response');
  return lenientParse(candidate);
}
