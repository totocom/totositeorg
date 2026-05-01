const punycodeBase = 36;
const punycodeTMin = 1;
const punycodeTMax = 26;
const punycodeSkew = 38;
const punycodeDamp = 700;
const punycodeInitialBias = 72;
const punycodeInitialN = 128;

function decodePunycodeDigit(codePoint: number) {
  if (codePoint >= 48 && codePoint <= 57) return codePoint - 22;
  if (codePoint >= 65 && codePoint <= 90) return codePoint - 65;
  if (codePoint >= 97 && codePoint <= 122) return codePoint - 97;
  return punycodeBase;
}

function adaptPunycodeBias(delta: number, numPoints: number, firstTime: boolean) {
  let nextDelta = firstTime
    ? Math.floor(delta / punycodeDamp)
    : Math.floor(delta / 2);
  nextDelta += Math.floor(nextDelta / numPoints);

  let k = 0;
  while (nextDelta > Math.floor(((punycodeBase - punycodeTMin) * punycodeTMax) / 2)) {
    nextDelta = Math.floor(nextDelta / (punycodeBase - punycodeTMin));
    k += punycodeBase;
  }

  return (
    k +
    Math.floor(
      ((punycodeBase - punycodeTMin + 1) * nextDelta) /
        (nextDelta + punycodeSkew),
    )
  );
}

function decodePunycodeLabel(encodedLabel: string) {
  const label = encodedLabel.toLowerCase();
  const output: number[] = [];
  const delimiterIndex = label.lastIndexOf("-");
  let inputIndex = 0;
  let n = punycodeInitialN;
  let i = 0;
  let bias = punycodeInitialBias;

  if (delimiterIndex >= 0) {
    for (let index = 0; index < delimiterIndex; index += 1) {
      output.push(label.charCodeAt(index));
    }
    inputIndex = delimiterIndex + 1;
  }

  while (inputIndex < label.length) {
    const oldI = i;
    let w = 1;

    for (let k = punycodeBase; ; k += punycodeBase) {
      if (inputIndex >= label.length) return encodedLabel;

      const digit = decodePunycodeDigit(label.charCodeAt(inputIndex));
      inputIndex += 1;

      if (digit >= punycodeBase) return encodedLabel;

      i += digit * w;
      const t =
        k <= bias
          ? punycodeTMin
          : k >= bias + punycodeTMax
            ? punycodeTMax
            : k - bias;

      if (digit < t) break;

      w *= punycodeBase - t;
      if (!Number.isSafeInteger(w) || !Number.isSafeInteger(i)) {
        return encodedLabel;
      }
    }

    const outputLength = output.length + 1;
    bias = adaptPunycodeBias(i - oldI, outputLength, oldI === 0);
    n += Math.floor(i / outputLength);
    i %= outputLength;

    if (n > 0x10ffff) return encodedLabel;

    output.splice(i, 0, n);
    i += 1;
  }

  return String.fromCodePoint(...output);
}

export function formatDisplayDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const domain = (() => {
    try {
      const parsedUrl = new URL(
        /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
      );
      return parsedUrl.hostname;
    } catch {
      return trimmed;
    }
  })();

  return domain
    .split(".")
    .map((label) => {
      if (!label.toLowerCase().startsWith("xn--")) return label;
      return decodePunycodeLabel(label.slice(4));
    })
    .join(".");
}

export function formatDisplayUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsedUrl = new URL(trimmed);
    const hostname = formatDisplayDomain(parsedUrl.hostname);

    return `${parsedUrl.protocol}//${hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ""}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return formatDisplayDomain(trimmed);
  }
}

export function formatDisplayDomainText(value: string) {
  return value.replace(
    /\b(?:xn--[a-z0-9-]+|[a-z0-9-]+)(?:\.(?:xn--[a-z0-9-]+|[a-z0-9-]+))+\b/gi,
    (domain) =>
      domain.toLowerCase().includes("xn--") ? formatDisplayDomain(domain) : domain,
  );
}
