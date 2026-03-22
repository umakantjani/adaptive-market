import YahooFinanceClass from 'yahoo-finance2'
import type { OHLCVBar, TickerInfo, TickerSearchResult } from '@/types/market'

const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

export async function fetchOHLCV(symbol: string, bars = 250): Promise<OHLCVBar[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 2)

  // Use chart() directly (historical() is deprecated in v3)
  const result = await yf.chart(symbol, {
    period1: startDate,
    period2: endDate,
    interval: '1d',
  }, { validateResult: false }) as { quotes?: Array<{ date: Date; open?: number; high?: number; low?: number; close: number; volume?: number }> }

  const quotes = result.quotes ?? []

  return quotes
    .slice(-bars)
    .map((r) => ({
      date: new Date(r.date).toISOString().split('T')[0],
      open: r.open ?? r.close,
      high: r.high ?? r.close,
      low: r.low ?? r.close,
      close: r.close,
      volume: r.volume ?? 0,
    }))
    .filter((b) => b.close != null && b.close > 0)
}

export async function fetchQuote(symbol: string): Promise<TickerInfo> {
  const quote = await yf.quote(symbol, {}, { validateResult: false })
  return {
    symbol: quote.symbol,
    name: (quote as { longName?: string }).longName || quote.shortName || symbol,
    exchange: quote.exchange,
    currentPrice: quote.regularMarketPrice ?? 0,
    priceChange: quote.regularMarketChange ?? 0,
    priceChangePct: quote.regularMarketChangePercent ?? 0,
    marketCap: quote.marketCap,
    week52High: (quote as { fiftyTwoWeekHigh?: number }).fiftyTwoWeekHigh,
    week52Low: (quote as { fiftyTwoWeekLow?: number }).fiftyTwoWeekLow,
  }
}

export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const result = await yf.search(query, { quotesCount: 8, newsCount: 0 }, { validateResult: false }) as { quotes?: unknown[] }
  return ((result.quotes || []) as Array<{
    symbol: string
    quoteType?: string
    longname?: string
    shortname?: string
    exchange?: string
  }>)
    .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .map((q) => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchange,
      type: q.quoteType,
    }))
}
