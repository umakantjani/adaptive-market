import YahooFinanceClass from 'yahoo-finance2'
import type { FundamentalData } from '@/types/valuation'

const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

const M = 1_000_000 // divide raw Yahoo values (absolute $) by this to get millions

export async function fetchFundamentals(symbol: string): Promise<FundamentalData> {
  // 1. Core summary data (TTM revenue, debt, cash, margins, beta, shares)
  const summary = await yf.quoteSummary(symbol, {
    modules: ['financialData', 'defaultKeyStatistics', 'summaryProfile'],
  }, { validateResult: false }) as Record<string, Record<string, unknown> | null>

  const fd = (summary.financialData ?? {}) as Record<string, unknown>
  const ks = (summary.defaultKeyStatistics ?? {}) as Record<string, unknown>
  const sp = (summary.summaryProfile ?? null) as Record<string, unknown> | null

  // 2. Annual income statement for interest expense and tax rate
  let interestExpense = 0
  let taxRate = 0
  try {
    const end = new Date()
    const start = new Date(); start.setFullYear(start.getFullYear() - 3)
    const financials = await yf.fundamentalsTimeSeries(symbol, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      type: 'annual',
      module: 'financials',
    }, { validateResult: false }) as Array<Record<string, unknown>>

    if (financials?.length) {
      // Use most recent annual record
      const latest = financials[financials.length - 1]
      interestExpense = num(latest.interestExpense) / M
      taxRate = num(latest.taxRateForCalcs)
    }
  } catch { /* fall through to defaults */ }

  // 3. Annual balance sheet for book equity, non-operating assets, minority interests
  let bookEquity = 0
  let nonOperatingAssets = 0
  let minorityInterests = 0
  try {
    const end = new Date()
    const start = new Date(); start.setFullYear(start.getFullYear() - 3)
    const bsData = await yf.fundamentalsTimeSeries(symbol, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      type: 'annual',
      module: 'balance-sheet',
    }, { validateResult: false }) as Array<Record<string, unknown>>

    if (bsData?.length) {
      const latest = bsData[bsData.length - 1]
      bookEquity = num(latest.stockholdersEquity ?? latest.commonStockEquity) / M
      nonOperatingAssets = num(latest.investmentsAndAdvances ?? latest.availableForSaleSecurities) / M
      minorityInterests = num(latest.minorityInterest) / M
    }
  } catch { /* fall through to defaults */ }

  // ── Assemble from summary (TTM figures) ───────────────────────────────────
  const revenue = num(fd.totalRevenue) / M
  const operatingMargin = num(fd.operatingMargins)        // already a ratio
  const ebit = revenue * operatingMargin
  const totalDebt = num(fd.totalDebt) / M
  const totalCash = num(fd.totalCash) / M
  const sharesOutstanding = num(ks.sharesOutstanding) / M // millions of shares
  const beta = num(ks.beta) || 1.0
  const revenueGrowthYoy = num(fd.revenueGrowth) || 0

  // Fall back to bookValue * shares if balance-sheet lookup failed
  if (!bookEquity) {
    bookEquity = num(ks.bookValue) * sharesOutstanding * M / M // bookValue is per share
  }

  // Fall back: effective tax rate from income statement or default
  if (!taxRate) {
    // Estimate: incomeTaxExpense isn't in financialData, use 20% as safe default
    taxRate = 0.20
  }

  // Interest expense fallback: use cost of debt approximation
  if (!interestExpense && totalDebt > 0) {
    interestExpense = totalDebt * 0.05 // 5% assumed cost of debt
  }

  const name = String(fd.symbol ?? symbol)
  const sector = sp ? String(sp.sector ?? 'Unknown') : 'Unknown'
  const industry = sp ? String(sp.industry ?? 'Unknown') : 'Unknown'

  // Fetch quote for current price and name
  const quote = await yf.quote(symbol, {}, { validateResult: false })
  const currentPrice = (quote as { regularMarketPrice?: number }).regularMarketPrice ?? 0
  const longName = (quote as { longName?: string; shortName?: string }).longName
    ?? (quote as { shortName?: string }).shortName ?? symbol

  return {
    symbol,
    name: longName,
    sector,
    industry,
    revenue: round(revenue),
    ebit: round(ebit),
    interestExpense: round(interestExpense),
    netIncome: round(num(fd.freeCashflow) / M), // using FCF as proxy for net income display
    bookEquity: round(bookEquity),
    bookDebt: round(totalDebt),
    cash: round(totalCash),
    nonOperatingAssets: round(nonOperatingAssets),
    minorityInterests: round(minorityInterests),
    sharesOutstanding: round(sharesOutstanding, 2),
    currentPrice,
    beta: round(beta, 3),
    effectiveTaxRate: round(taxRate, 3),
    revenueGrowthYoy: round(revenueGrowthYoy, 4),
    operatingMargin: round(operatingMargin, 4),
  }
}

function num(v: unknown): number {
  if (typeof v === 'number') return isFinite(v) ? v : 0
  return 0
}

function round(v: number, decimals = 0): number {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}
