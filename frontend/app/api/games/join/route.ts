import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TeamMemberRole } from "@/app/generated/prisma/client";
import { ALL_ROLES } from "@/lib/game-utils";
import bcrypt from "bcryptjs";

/**
 * POST /api/games/join
 *
 * Creates an ephemeral Player user and joins them to a team.
 *
 * EPHEMERAL JOIN TOKENS (Sprint 3):
 * Since join players don't have passwords, we generate a random UUID as
 * their password, return it to the client, and the client immediately calls
 * signIn() with it. This is a temporary flow to be replaced with a proper
 * invite/magic-link system in Sprint 7.
 */
export async function POST(req: NextRequest) {
  let body: {
    code?: string;
    playerName?: string;
    brandName?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, playerName, brandName, role } = body;

  // ── Validate inputs ──
  if (!code || typeof code !== "string" || code.length !== 6) {
    return NextResponse.json({ error: "Invalid game code" }, { status: 400 });
  }
  if (!playerName || typeof playerName !== "string" || playerName.trim().length < 1) {
    return NextResponse.json({ error: "Player name required" }, { status: 400 });
  }
  if (
    !brandName ||
    typeof brandName !== "string" ||
    brandName.trim().length < 2 ||
    brandName.trim().length > 30
  ) {
    return NextResponse.json(
      { error: "Brand name must be 2–30 characters" },
      { status: 400 }
    );
  }
  // Role validated after game mode is known (Party Mode forces CEO)

  // ── Basic profanity check ──
  const { Filter } = await import("bad-words");
  const filter = new Filter();
  if (filter.isProfane(playerName.trim()) || filter.isProfane(brandName.trim())) {
    return NextResponse.json({ error: "INAPPROPRIATE CONTENT DETECTED" }, { status: 400 });
  }

  const cleanName = playerName.trim();
  const cleanBrand = brandName.trim();

  // ── Look up game ──
  const game = await db.game.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      teams: {
        include: {
          members: { include: { user: true } },
        },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "GAME NOT FOUND" }, { status: 404 });
  }
  if (game.status !== "LOBBY") {
    return NextResponse.json(
      { error: "GAME IS NOT IN LOBBY" },
      { status: 400 }
    );
  }

  // In Party Mode each player runs solo as CEO; role param is ignored
  const isParty = game.mode === "PARTY";
  const chosenRole: TeamMemberRole = isParty ? "CEO" : (role as TeamMemberRole);

  if (!isParty && (!role || !ALL_ROLES.includes(role as TeamMemberRole))) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // ── Find or create team ──
  let team = game.teams.find(
    (t) => t.brandName.toLowerCase() === cleanBrand.toLowerCase()
  );

  if (team && !isParty) {
    // Classroom: joining existing team — check role isn't taken
    const roleTaken = team.members.some((m) => m.role === chosenRole);
    if (roleTaken) {
      return NextResponse.json(
        { error: `ROLE ${chosenRole} IS ALREADY TAKEN ON THIS TEAM` },
        { status: 400 }
      );
    }
  }
  if (team && isParty) {
    // Party: brand name must be unique per player — don't allow joining someone else's company
    return NextResponse.json(
      { error: "BRAND NAME ALREADY TAKEN — CHOOSE A DIFFERENT NAME" },
      { status: 400 }
    );
  }

  // ── Create ephemeral user ──
  // Generate a cryptographically random UUID as ephemeral password
  const ephemeralPassword = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(ephemeralPassword, 10);

  // Generate unique email
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 8);
  const email = `${slug}-${suffix}@player.local`;

  const newUser = await db.user.create({
    data: {
      email,
      passwordHash,
      name: cleanName,
      role: "PLAYER",
    },
  });

  // ── Create team if needed ──
  if (!team) {
    const createdTeam = await db.team.create({
      data: {
        gameId: game.id,
        brandName: cleanBrand,
      },
      include: { members: { include: { user: true } } },
    });
    team = createdTeam;
  }

  // ── Create team member ──
  await db.teamMember.create({
    data: {
      teamId: team.id,
      userId: newUser.id,
      role: chosenRole,
    },
  });

  return NextResponse.json(
    {
      userId: newUser.id,
      teamId: team.id,
      gameId: game.id,
      email,
      // Ephemeral password returned so client can immediately signIn()
      // This will be replaced with a proper invite flow in Sprint 7.
      ephemeralPassword,
      redirectTo: `/lobby/${game.id}`,
    },
    { status: 201 }
  );
}
