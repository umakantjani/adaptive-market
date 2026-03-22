import { defineConfig } from 'prisma/config'
import path from 'node:path'

const dbPath = path.resolve(process.cwd(), 'prisma', 'adaptive-market.db')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: `file:${dbPath}`,
  },
})
