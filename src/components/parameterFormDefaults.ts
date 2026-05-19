import type { UploadedImage } from '../ui/ImageUpload'

export interface FormValues {
    image: UploadedImage | null
    blockWidth: number
    mosaicType: '2d' | '3d'
    backgroundPercent: number
    framed: boolean
}

export const DEFAULT_VALUES: FormValues = {
    image: null,
    blockWidth: 4,
    mosaicType: '2d',
    backgroundPercent: 100,
    framed: true,
}
