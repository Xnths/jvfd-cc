import { ImageResponse } from 'next/og'
import { BrandMark } from '@/components/brand/BrandMark'
import { brand } from '@/lib/brand'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: brand.colors.paper, borderRadius: 8 }}>
                <BrandMark size={28} color={brand.colors.forest} accent={brand.colors.clay} />
            </div>
        ),
        { ...size },
    )
}
