import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { DCFInputs, DCFResults } from '@/types/valuation'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    symbol: string
    name: string
    dcfInputs: DCFInputs
    dcfResults: DCFResults
    reportText: string
  }

  const { symbol, name, dcfInputs, dcfResults, reportText } = body

  if (!reportText?.trim()) {
    return NextResponse.json({ error: 'reportText is required' }, { status: 400 })
  }

  try {
    const ticker = await prisma.ticker.upsert({
      where: { symbol },
      update: { name },
      create: { symbol, name },
    })

    const report = await prisma.valuationReport.create({
      data: {
        tickerId: ticker.id,
        inputsJson: JSON.stringify(dcfInputs),
        resultsJson: JSON.stringify(dcfResults),
        reportText,
        intrinsicValue: dcfResults.intrinsicValuePerShare,
        currentPrice: dcfResults.currentPrice,
        marginOfSafety: dcfResults.marginOfSafety,
      },
      select: { id: true },
    })

    return NextResponse.json({ ok: true, id: report.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Save failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
