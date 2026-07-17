export interface ParsedEffect {
  type: string | null;
  amount: number | null;
}

/** Matches a Russian word stem + any Cyrillic ending */
function w(stem: string): string {
  return stem + '[а-яё]*';
}

/** Word boundary for Russian text: start of word */
function wbStart(): string {
  return '(?:^|[^а-яё])';
}

/** Word boundary for Russian text: end of word */
function wbEnd(): string {
  return '(?:[^а-яё]|$)';
}

/* ─────────────── exclusion check ─────────────── */

function hasExclusionIndicators(text: string): boolean {
  const t = text.toLowerCase();

  const alwaysExcludePatterns = [
    new RegExp(wbStart() + w('сокращен') + '[ ]+' + w('штат') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('сокращен') + '[ ]+' + w('сотрудник') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('сокращен') + '[ ]+' + w('работник') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('сокращен') + '[ ]+' + w('персонал') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('сокращен') + '.*' + w('физическ') + '[ ]+' + w('лиц') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('физическ') + '[ ]+' + w('сокращен') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('высвобождени') + '[ ]+' + w('трудозатрат') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('высвобождени') + '[ ]+' + w('рабочих') + '[ ]+' + w('мест') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '.*' + w('ставок') + '.*[0-9][0-9\\s,.]*[ ]*(?:тыс|млн|руб)', 'i'),
    new RegExp(w('ставок') + '.*' + w('экономи') + '.*[0-9][0-9\\s,.]*[ ]*(?:тыс|млн|руб)', 'i'),
    new RegExp(wbStart() + w('экономи') + '.*' + w('ставок') + '.*' + w('сумм') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('фонд') + '[а-яё]*[ ]+' + w('оплат') + '[а-яё]*[ ]+' + w('труд') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('зарплат') + wbEnd(), 'i'),
    new RegExp('чел\\./час', 'i'),
    /человеко-часов/i,
    new RegExp('чел\\/час', 'i'),
  ];
  if (alwaysExcludePatterns.some(p => p.test(text))) return true;

  if (
    new RegExp(
      w('экономи') + '.*' + w('за') + '[ ]*сч[её]т[ ]+.*(?:' + w('сокращен') + '|' + w('высвобожден') + '|' + w('ставок') + '|' + w('штат') + '|' + w('сотрудник') + '|' + w('персонал') + ')',
      'i'
    ).test(text)
  ) return true;

  if (new RegExp(wbStart() + w('затрат') + '[ ]+' + w('на') + '[ ]+' + w('реализаци') + wbEnd(), 'i').test(text)) return true;

  // "на ставку" — the key pattern for rate-per-person calculations
  if (new RegExp(wbStart() + 'на[ ]+ставку' + wbEnd() + '|в[ ]+год[ ]+на[ ]+ставку|стоимостью[ ]+.*[ ]*ставки', 'i').test(text)) return true;

  const hasOnlyStaffFigures =
    new RegExp(wbStart() + 'ставок?' + wbEnd(), 'i').test(t) &&
    !/[0-9][0-9\s,.]*\s*(млн|млрд|тыс)\.?\s*руб/i.test(t);
  if (hasOnlyStaffFigures) return true;

  return false;
}

/* ─────────────── per-unit amount check ─────────────── */

function isPerUnitAmount(text: string): boolean {
  const perUnitPatterns = [
    new RegExp(wbStart() + 'на[ ]+1?[ ]*объект' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'на[ ]+1?[ ]*пациента' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'на[ ]+1?[ ]*документ' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'на[ ]+единицу' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'на[ ]+1[ ]*чел' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'удельный' + wbEnd(), 'i'),
  ];

  const amountContextPattern =
    /(\d[\d\s,.]*\s*(?:млн|млрд|тыс)?\.?\s*руб[^.]*?)(\bна\s+1?\s*(?:объект|пациента|документ|единицу|чел))/i;
  if (amountContextPattern.test(text)) return true;

  const rangePattern = /от\s+\d[\d\s,.]*\s*(?:тыс|млн)?\.?\s*руб\s+до\s+\d/i;
  if (rangePattern.test(text)) {
    const hasTotal = new RegExp(wbStart() + '(?:всего|итого|общая\s+сумма|объ[её]м)' + wbEnd(), 'i').test(text);
    if (!hasTotal) return true;
  }

  return perUnitPatterns.some(pattern => {
    const match = pattern.exec(text);
    if (match) {
      const beforeText = text.substring(Math.max(0, match.index - 100), match.index);
      const hasAmount = /\d[\d\s,.]*\s*(?:млн|млрд|тыс)?\.?\s*руб/.test(beforeText);
      const hasTotal = new RegExp(wbStart() + '(?:всего|итого|общая\s+сумма|объ[её]м)' + wbEnd(), 'i').test(text);
      return hasAmount && !hasTotal;
    }
    return false;
  });
}

/* ─────────────── unit conversion → млн руб. ─────────────── */

function convertToMillions(amount: number, unit: string): number {
  const cleanUnit = unit.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

  if (cleanUnit.includes('млрд')) return amount * 1000;
  if (cleanUnit.includes('тыс'))   return amount / 1000;
  if (cleanUnit.includes('млн'))   return amount;
  return amount / 1_000_000;
}

/* ─────────────── period multiplier ─────────────── */

function getPeriodMultiplier(context: string): number {
  const c = context.toLowerCase();

  if (new RegExp(wbStart() + '(?:в|на)[ ]+месяц' + wbEnd() + '|ежемесячно|[/]\s*мес', 'i').test(c)) return 12;
  if (new RegExp(wbStart() + '(?:в|на)[ ]+год' + wbEnd() + '|ежегодно|годовой|[/]\s*год', 'i').test(c)) return 1;

  return 1;
}

/* ─────────────── amount extraction ─────────────── */

function extractAmounts(text: string): Array<{
  amount: number;
  unit: string;
  context: string;
  multiplier: number;
}> {
  const results: Array<{ amount: number; unit: string; context: string; multiplier: number }> = [];

  const amountPattern =
    /(\d[\d\s,.]*(?:[–-]\d[\d\s,.]*)?)\s*(млн\.?\s*руб|млрд\.?\s*руб|тыс\.?\s*руб|руб\.?|рублей|млн\s*рублей|млрд\s*рублей|тыс\s*рублей)/gi;

  let match: RegExpExecArray | null;
  while ((match = amountPattern.exec(text)) !== null) {
    let rawAmount = match[1];
    const unit = match[2];

    const dotCount = rawAmount.split('.').length - 1;
    const commaCount = rawAmount.split(',').length - 1;

    if (dotCount > 1 && commaCount === 1) {
      rawAmount = rawAmount.replace(/\./g, '').replace(',', '.');
    } else if (commaCount > 1 && dotCount === 1) {
      rawAmount = rawAmount.replace(/,/g, '');
    } else {
      rawAmount = rawAmount.replace(/\s/g, '').replace(',', '.');
    }

    let numericAmount: number;
    if (rawAmount.includes('–') || rawAmount.includes('-')) {
      const parts = rawAmount.split(/[–-]/);
      numericAmount = parseFloat(parts[0]);
    } else {
      numericAmount = parseFloat(rawAmount);
    }

    if (!isNaN(numericAmount) && numericAmount > 0) {
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd   = Math.min(text.length, match.index + match[0].length + 50);
      const context      = text.substring(contextStart, contextEnd);
      const multiplier   = getPeriodMultiplier(context);

      results.push({ amount: numericAmount, unit, context, multiplier });
    }
  }

  return results;
}

/* ─────────────── effect-type detection ─────────────── */

function determineEffectType(text: string, context: string = text): string | null {
  const fullText = (text + ' ' + context).toLowerCase();

  const finePatterns = [
    new RegExp(wbStart() + 'поступлен[а-яё]*[ ]+.*[ ]*по[ ]+штрафам', 'i'),
    new RegExp(wbStart() + 'поступлен[а-яё]*[ ]+.*[ ]*штраф', 'i'),
    new RegExp(wbStart() + 'штрафы' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'административн[а-яё]*[ ]+штраф', 'i'),
    new RegExp(wbStart() + 'неотвратимость[ ]+наказания' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'взыскан', 'i'),
    new RegExp(wbStart() + 'санкци', 'i'),
    new RegExp(wbStart() + 'по[ ]+штрафам' + wbEnd(), 'i'),
  ];
  if (finePatterns.some(p => p.test(fullText))) return 'Штраф';

  const savingsPatterns = [
    new RegExp(wbStart() + w('экономи') + '[ ]+' + w('бюджет') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '[ ]+' + w('денежных') + '[ ]+' + w('средств') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '[ ]+' + w('бюджетных') + '[ ]+' + w('средств') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('предотвращен') + '[ ]+' + w('перерасход') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('снижен') + '[ ]+' + w('расходов') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('снижен') + '[ ]+' + w('затрат') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('избежан') + '[ ]+' + w('удорожан') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '[ ]+.*[ ]*на[ ]+развитие' + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '[ ]+.*[ ]*на[ ]+эксплуатаци' + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '[ ]+.*[ ]*на[ ]+содержан' + wbEnd(), 'i'),
    new RegExp(wbStart() + w('экономи') + '[ ]+' + w('расходов') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('сокращен') + '[ ]+' + w('расходов') + wbEnd(), 'i'),
    new RegExp(wbStart() + w('минимизац') + '[ ]+.*[ ]*' + w('ошибок') + wbEnd(), 'i'),
  ];
  if (savingsPatterns.some(p => p.test(fullText))) return 'Экономия бюджета';

  const receiptPatterns = [
    /доп\.?\s*налогов[а-яё]*\s*поступлен/i,
    new RegExp(wbStart() + 'рост[ ]+поступлений[ ]+в[ ]+бюджет' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'поступления[ ]+в[ ]+бюджет' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'рост[ ]+налоговых[ ]+доходов' + wbEnd(), 'i'),
    new RegExp(wbStart() + 'мобилизация[ ]+доходов' + wbEnd(), 'i'),
    /дополнительн[а-яё]*\s*поступлен/i,
    new RegExp(wbStart() + 'рост[ ]+доходов' + wbEnd(), 'i'),
    /увеличени[а-яё]*\s*поступлен/i,
  ];
  if (receiptPatterns.some(p => p.test(fullText))) {
    if (!finePatterns.some(p => p.test(fullText))) return 'Поступления в бюджет';
  }

  if (new RegExp(wbStart() + 'экономия' + wbEnd(), 'i').test(fullText) &&
      !new RegExp(wbStart() + 'экономия[ ]+.*[ ]*на[ ]+ставку' + wbEnd(), 'i').test(fullText)) {
    return 'Экономия бюджета';
  }

  if (new RegExp(wbStart() + 'поступлен[а-яё]*[ ]+в[ ]+бюджет', 'i').test(fullText)) {
    if (/штраф|взыскан|санкц/i.test(fullText)) return 'Штраф';
    return 'Поступления в бюджет';
  }

  return null;
}

/* ════════════════════ MAIN ════════════════════ */

export function parseEffects(text: string): ParsedEffect {
  if (!text || text.trim().length === 0) {
    return { type: null, amount: null };
  }

  if (hasExclusionIndicators(text)) {
    return { type: null, amount: null };
  }

  if (isPerUnitAmount(text)) {
    return { type: null, amount: null };
  }

  const amounts = extractAmounts(text);
  if (amounts.length === 0) {
    return { type: null, amount: null };
  }

  const dominantType = determineEffectType(text);
  if (!dominantType) {
    return { type: null, amount: null };
  }

  let totalAmount = 0;
  let hasValidAmount = false;

  for (const { amount, unit, context, multiplier } of amounts) {
    const amountType = determineEffectType(text, context);

    if (amountType === dominantType) {
      totalAmount += convertToMillions(amount, unit) * multiplier;
      hasValidAmount = true;
    }
  }

  if (!hasValidAmount) {
    for (const { amount, unit, multiplier } of amounts) {
      totalAmount += convertToMillions(amount, unit) * multiplier;
      hasValidAmount = true;
    }
  }

  if (!hasValidAmount || totalAmount === 0) {
    return { type: null, amount: null };
  }

  return {
    type: dominantType,
    amount: Math.round(totalAmount * 100) / 100,
  };
}
