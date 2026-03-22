/**
 * Auto-save a DCF snapshot (no AI report text).
 * Called each time the valuation page loads — mirrors how TASnapshot is saved
 * each time a ticker is searched.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DCFInputs, DCFResults } from '@/types/valuation'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    symbol: string
    name: string
    dcfInputs: DCFInputs
    dcfResults: DCFResults
  }

  const { symbol, name, dcfInputs, dcfResults } = body

  try {
    const ticker = await prisma.ticker.upsert({
      where: { symbol },
      update: { name },
      create: { symbol, name },
    })

    await prisma.valuationReport.create({
      data: {
        tickerId: ticker.id,
        inputsJson: JSON.stringify(dcfInputs),
        resultsJson: JSON.stringify(dcfResults),
        reportText: null,   // snapshot — no AI text yet
        intrinsicValue: dcfResults.intrinsicValuePerShare,
        currentPrice: dcfResults.currentPrice,
        marginOfSafety: dcfResults.marginOfSafety,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'snapshot save failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
