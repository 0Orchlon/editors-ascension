/** Төрлийн ЦОРЫН ГАНЦ эх — `shared/validate/schemas.ts`-ээс infer хийгдэнэ (lld.md §5.2). */
import type { Infer } from '../validate/dsl.ts';
import type * as S from '../validate/schemas.ts';

export type { Issue } from '../validate/dsl.ts';

export type Problem = Infer<typeof S.Problem>;
export type RejectionReason = Infer<typeof S.RejectionReason>;
export type HealthOk = Infer<typeof S.HealthOk>;
export type HealthDegraded = Infer<typeof S.HealthDegraded>;
export type PlayerCredentials = Infer<typeof S.PlayerCredentials>;

export type GameState = Infer<typeof S.GameState>;
export type BossScores = Infer<typeof S.BossScores>;
export type BossAttempt = Infer<typeof S.BossAttempt>;
export type ProjectState = Infer<typeof S.ProjectState>;
export type MilestoneKey = Infer<typeof S.MilestoneKey>;

export type SavePayload = Infer<typeof S.SavePayload>;
export type SaveAck = Infer<typeof S.SaveAck>;
export type SnapshotRef = Infer<typeof S.SnapshotRef>;
export type SaveHistory = Infer<typeof S.SaveHistory>;
export type RestoreRequest = Infer<typeof S.RestoreRequest>;

export type ActionType = Infer<typeof S.ActionType>;
export type Action = Infer<typeof S.Action>;
export type ActionBatchRequest = Infer<typeof S.ActionBatchRequest>;
export type ActionResult = Infer<typeof S.ActionResult>;
export type ActionBatchResponse = Infer<typeof S.ActionBatchResponse>;
export type DomainEventType = Infer<typeof S.DomainEventType>;
export type DomainEvent = Infer<typeof S.DomainEvent>;

export type TransferCode = Infer<typeof S.TransferCode>;
export type RedeemRequest = Infer<typeof S.RedeemRequest>;

export type SkillTag = Infer<typeof S.SkillTag>;

// ── v1.2.0 — гүнзгийрүүлэлтийн төрлүүд (plan.md §11.2)
export type MasteryTrack = Infer<typeof S.MasteryTrack>;
export type DifficultyTier = Infer<typeof S.DifficultyTier>;
export type ReplayLogEntry = Infer<typeof S.ReplayLogEntry>;
export type Rarity = Infer<typeof S.Rarity>;
export type CosmeticSlot = Infer<typeof S.CosmeticSlot>;
export type CosmeticUnlockSource = Infer<typeof S.CosmeticUnlockSource>;
export type CosmeticItem = Infer<typeof S.CosmeticItem>;
export type CampLayout = Infer<typeof S.CampLayout>;
export type CampLayoutSlots = Infer<typeof S.CampLayoutSlots>;
export type GuildDefinition = Infer<typeof S.GuildDefinition>;
export type SideQuestChain = Infer<typeof S.SideQuestChain>;
export type TutorialRef = Infer<typeof S.TutorialRef>;
export type QuestDefinition = Infer<typeof S.QuestDefinition>;
export type DungeonDefinition = Infer<typeof S.DungeonDefinition>;
export type DungeonQuestion = DungeonDefinition['questions'][number];
export type AchievementDefinition = Infer<typeof S.AchievementDefinition>;
export type EncounterDefinition = Infer<typeof S.EncounterDefinition>;
export type LootItem = Infer<typeof S.LootItem>;
export type SkillDefinition = Infer<typeof S.SkillDefinition>;
export type ContentPack = Infer<typeof S.ContentPack>;
export type ProgressionConstants = Infer<typeof S.ProgressionConstants>;
