import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Import secara dinamis agar tidak error window is not defined (SSR)
const MapCore = dynamic(() => import('./map-core'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-muted/20 flex items-center justify-center rounded-lg border border-dashed">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <MapPin className="h-8 w-8 animate-bounce opacity-50" />
        <span className="text-sm font-medium">Memuat Peta...</span>
      </div>
    </div>
  )
})

interface MapAllocationProps {
  districtAllocations: Record<string, { urea: number, npk: number }>
}

export function MapAllocation({ districtAllocations }: MapAllocationProps) {
  if (Object.keys(districtAllocations).length === 0) return null

  return (
    <Card className="shadow-xs overflow-hidden border-border/50">
      <div className="bg-muted/20 px-4 py-2 border-b text-xs font-semibold text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Peta Sebaran Alokasi per Kecamatan</span>
        <Badge variant="secondary" className="font-mono text-[9px]">{Object.keys(districtAllocations).length} Wilayah Tercatat</Badge>
      </div>
      <CardContent className="p-3">
        <MapCore districtAllocations={districtAllocations} />
      </CardContent>
    </Card>
  )
}
