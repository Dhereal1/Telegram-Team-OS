export interface CommandContext {
  teamId: string;
  actorUserId: string;
  args: string[];
  chatId: bigint;
  chatType: string;
  fromTelegramId: bigint;
}

