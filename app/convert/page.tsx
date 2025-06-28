import { ConversionCalculator } from "@/components/convert/conversion-calculator"
import { MainLayout } from "@/components/layout/main-layout"

export default function ConvertPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Convert Crypto</h1>
          <p className="text-muted-foreground">Convert your cryptocurrency to pay for utilities and services.</p>
        </div>
        <ConversionCalculator />
      </div>
    </MainLayout>
  )
}
