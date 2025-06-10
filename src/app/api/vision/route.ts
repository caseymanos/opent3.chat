import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

const ImageAnalysisSchema = z.object({
  description: z.string().describe('Detailed description of what is shown in the image'),
  summary: z.string().describe('Brief summary of the image content'),
  objects: z.array(z.string()).describe('List of objects, people, or entities detected in the image'),
  text: z.string().optional().describe('Any text found in the image (OCR)'),
  mood: z.string().optional().describe('Overall mood or atmosphere of the image'),
  colors: z.array(z.string()).describe('Dominant colors in the image'),
  dimensions: z.object({
    estimated_width: z.number().optional(),
    estimated_height: z.number().optional(),
    aspect_ratio: z.string().optional()
  }).optional(),
  technical_details: z.object({
    lighting: z.string().optional(),
    composition: z.string().optional(),
    quality: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const { image, task = 'analyze' } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Validate image is base64
    if (typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image must be a base64 string' },
        { status: 400 }
      )
    }

    console.log('🔍 [Vision API] Analyzing image with Claude Vision...')

    const result = await generateObject({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: task === 'ocr' 
                ? 'Extract and transcribe all text visible in this image. Maintain formatting and structure as much as possible.'
                : 'Analyze this image in detail. Provide a comprehensive description, identify objects and entities, extract any text (OCR), and note the overall mood and technical aspects.'
            },
            {
              type: 'image',
              image: `data:image/jpeg;base64,${image}`
            }
          ]
        }
      ],
      schema: ImageAnalysisSchema,
      temperature: 0.3
    })

    console.log('✅ [Vision API] Analysis complete:', result.object)

    return NextResponse.json(result.object)

  } catch (error) {
    console.error('❌ [Vision API] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Vision analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Vision API is running',
    capabilities: [
      'Image analysis and description',
      'Object and entity detection',
      'OCR (text extraction)',
      'Mood and atmosphere analysis',
      'Color analysis',
      'Technical assessment'
    ],
    models: ['claude-3-5-sonnet-20241022'],
    formats: ['JPEG', 'PNG', 'GIF', 'WebP', 'BMP']
  })
}