import { ImageResponse } from 'next/og'
import { BrandMark } from '@/components/brand/BrandMark'
import { brand } from '@/lib/brand'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: brand.colors.paper }}>
                <BrandMark size={140} color={brand.colors.forest} accent={brand.colors.clay} />
            </div>
        ),
        { ...size },
    )
}
