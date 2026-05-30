import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import type {
  ProjectDocument,
  ProjectProofAsset,
  ProjectProofManifest,
  ProjectProofWarning
} from '../shared/project'
import { normalizeProjectDocument } from '../shared/project'
import type { FileProjectRepository } from './project-repository'

const APP_NAME = 'Story Studio' as const
const PROOF_NOTICE =
  '这是一份由 Story Studio 在本地生成的创作证明文件，用于记录项目快照与 SHA-256 指纹。它不会上传服务器，不包含可信时间戳、法律公证或版权登记。'

export interface ProjectProofBuildResult {
  manifest: ProjectProofManifest
  projectDocumentSha256: string
  proofPayloadSha256: string
  serializedManifest: string
}

export async function buildProjectProofManifest(
  document: ProjectDocument,
  repository: FileProjectRepository,
  appVersion: string
): Promise<ProjectProofBuildResult> {
  const snapshot = normalizeProjectDocument(document)
  const createdAt = new Date().toISOString()
  const projectDocumentSha256 = sha256String(stableStringify(snapshot))
  const { assets, warnings } = await buildAssetProofs(snapshot.assets.items, repository)

  const manifestWithoutPayloadHash = {
    format: 'story-studio.local-proof' as const,
    version: 1 as const,
    createdAt,
    app: {
      name: APP_NAME,
      version: appVersion
    },
    project: {
      projectId: snapshot.projectId,
      title: snapshot.title,
      updatedAt: snapshot.updatedAt
    },
    scope: {
      includesProjectSnapshot: true as const,
      includesManagedAssetHashes: true as const,
      includesAssetBinaryContents: false as const,
      includesServerTimestamp: false as const,
      includesLegalNotarization: false as const
    },
    hashes: {
      algorithm: 'sha256' as const,
      canonicalization: 'story-studio-json-stable-v1' as const,
      projectDocumentSha256,
      proofPayloadSha256: ''
    },
    snapshot,
    assets,
    warnings,
    notice: PROOF_NOTICE
  }

  const proofPayloadSha256 = sha256String(
    stableStringify({
      ...manifestWithoutPayloadHash,
      hashes: {
        ...manifestWithoutPayloadHash.hashes,
        proofPayloadSha256: undefined
      }
    })
  )
  const manifest: ProjectProofManifest = {
    ...manifestWithoutPayloadHash,
    hashes: {
      ...manifestWithoutPayloadHash.hashes,
      proofPayloadSha256
    }
  }

  return {
    manifest,
    projectDocumentSha256,
    proofPayloadSha256,
    serializedManifest: `${JSON.stringify(manifest, null, 2)}\n`
  }
}

export function safeProofFileName(title: string | undefined): string {
  const name = title?.trim() || APP_NAME
  return `${name
    .split('')
    .map((char) => (/[<>:"/\\|?*]/.test(char) || char.charCodeAt(0) < 32 ? '_' : char))
    .join('')}.story-proof.json`
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const object = value as Record<string, unknown>
  const entries = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)

  return `{${entries.join(',')}}`
}

function sha256String(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function buildAssetProofs(
  assets: ProjectDocument['assets']['items'],
  repository: FileProjectRepository
): Promise<{ assets: ProjectProofAsset[]; warnings: ProjectProofWarning[] }> {
  const proofs = await Promise.all(
    assets.map(async (asset): Promise<ProjectProofAsset> => {
      const baseAsset = {
        relativePath: asset.relativePath,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        createdAt: asset.createdAt
      }

      try {
        const absolutePath = repository.getAssetAbsolutePath(asset.relativePath)
        const [fileStats, sha256] = await Promise.all([
          stat(absolutePath),
          sha256File(absolutePath)
        ])
        return {
          ...baseAsset,
          status: 'ok',
          size: fileStats.size,
          sha256
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '素材文件读取失败'
        return {
          ...baseAsset,
          status: message.includes('ENOENT') ? 'missing' : 'error',
          error: message
        }
      }
    })
  )
  const warnings = proofs
    .filter((asset) => asset.status !== 'ok')
    .map((asset) => ({
      code: 'asset-hash-failed',
      message: `素材 ${asset.originalName || asset.relativePath} 未能计算指纹：${asset.error || '未知错误'}`
    }))

  return { assets: proofs, warnings }
}
