import { SupabaseClient } from '@supabase/supabase-js';
import { AppState, CheckIn, Habit, Stake } from './types';
import { INITIAL_HABITS, getInitialStakes } from './seed';

// Type mapping helpers (camelCase <-> snake_case)
export function habitToRow(habit: Habit) {
  return {
    id: habit.id,
    player_id: habit.playerId,
    title: habit.title,
    description: habit.description || '',
    category: habit.category,
    points: habit.points,
    icon_name: habit.iconName,
    frequency: habit.frequency || 'daily',
    weekly_target_days: habit.weeklyTargetDays || null,
    is_quantitative: habit.isQuantitative || false,
    quantity_unit: habit.quantityUnit || null,
    max_quantity: habit.maxQuantity || null,
    points_per_unit: habit.pointsPerUnit || 1,
    requires_proof: habit.requiresProof || false,
    order: habit.order || 0,
    is_active: habit.isActive !== false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToHabit(row: any): Habit {
  return {
    id: row.id,
    playerId: row.player_id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    points: Number(row.points) || 20,
    iconName: row.icon_name || 'Activity',
    frequency: row.frequency || 'daily',
    weeklyTargetDays: row.weekly_target_days || undefined,
    isQuantitative: !!row.is_quantitative,
    quantityUnit: row.quantity_unit || undefined,
    maxQuantity: row.max_quantity || undefined,
    pointsPerUnit: row.points_per_unit || 1,
    requiresProof: !!row.requires_proof,
    order: row.order || 0,
    isActive: row.is_active !== false,
  };
}

export function checkInToRow(checkIn: CheckIn) {
  const proofPayload =
    checkIn.proofUrls && checkIn.proofUrls.length > 0
      ? JSON.stringify(checkIn.proofUrls)
      : checkIn.proofUrl || null;

  return {
    id: checkIn.id,
    habit_id: checkIn.habitId,
    player_id: checkIn.playerId,
    date: checkIn.date,
    points_earned: checkIn.pointsEarned,
    quantity: checkIn.quantity || null,
    proof_url: proofPayload,
    completed_at: checkIn.completedAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToCheckIn(row: any): CheckIn {
  let proofUrl: string | undefined = undefined;
  let proofUrls: string[] | undefined = undefined;

  if (row.proof_url) {
    if (typeof row.proof_url === 'string' && row.proof_url.startsWith('[')) {
      try {
        const parsed = JSON.parse(row.proof_url);
        if (Array.isArray(parsed) && parsed.length > 0) {
          proofUrls = parsed;
          proofUrl = parsed[0];
        }
      } catch {
        proofUrl = row.proof_url;
        proofUrls = [row.proof_url];
      }
    } else {
      proofUrl = row.proof_url;
      proofUrls = [row.proof_url];
    }
  }

  return {
    id: row.id,
    habitId: row.habit_id,
    playerId: row.player_id,
    date: typeof row.date === 'string' ? row.date.slice(0, 10) : row.date,
    pointsEarned: Number(row.points_earned) || 0,
    quantity: row.quantity || undefined,
    proofUrl,
    proofUrls,
    completedAt: row.completed_at || new Date().toISOString(),
  };
}

export function stakeToRow(stake: Stake) {
  return {
    id: stake.id,
    period: stake.period,
    period_key: stake.periodKey,
    title: stake.title,
    description: stake.description || '',
    status: stake.status,
    winner_id: stake.winnerId || null,
    due_date: stake.dueDate || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToStake(row: any): Stake {
  return {
    id: row.id,
    period: row.period,
    periodKey: row.period_key,
    title: row.title,
    description: row.description || '',
    status: row.status,
    winnerId: row.winner_id || undefined,
    dueDate: row.due_date || '',
  };
}

// Full Cloud Hydration & Seed
export async function syncInitialDataFromSupabase(
  supabase: SupabaseClient
): Promise<Partial<AppState> | null> {
  try {
    // 1. Fetch habits
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .order('order', { ascending: true });

    if (habitsError) {
      console.warn('Supabase fetch habits error:', habitsError.message);
      return null;
    }

    // If database is completely empty, seed it automatically
    if (!habitsData || habitsData.length === 0) {
      console.log('Seeding initial habits to Supabase...');
      // Seed players
      await supabase.from('players').upsert([
        { id: 'maciek', name: 'Maciek', avatar: '⚡', color: '#60a5fa' },
        { id: 'myrna', name: 'Myrna', avatar: '✨', color: '#f472b6' },
      ]);

      // Seed habits
      const habitRows = INITIAL_HABITS.map(habitToRow);
      await supabase.from('habits').upsert(habitRows);

      // Seed stakes
      const stakeRows = getInitialStakes().map(stakeToRow);
      await supabase.from('stakes').upsert(stakeRows);

      return {
        habits: INITIAL_HABITS,
        stakes: getInitialStakes(),
      };
    }

    const fetchedHabits = habitsData.map(rowToHabit);

    // 2. Fetch check-ins
    const { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('*');

    const fetchedCheckIns = checkInsData && !checkInsError ? checkInsData.map(rowToCheckIn) : [];

    // 3. Fetch stakes
    const { data: stakesData, error: stakesError } = await supabase
      .from('stakes')
      .select('*');

    const fetchedStakes = stakesData && !stakesError ? stakesData.map(rowToStake) : getInitialStakes();

    return {
      habits: fetchedHabits,
      checkIns: fetchedCheckIns,
      stakes: fetchedStakes,
    };
  } catch (err) {
    console.error('Failed to sync data from Supabase:', err);
    return null;
  }
}

// Remote Mutations
export async function insertCheckInSupabase(supabase: SupabaseClient, checkIn: CheckIn) {
  try {
    const row = checkInToRow(checkIn);
    await supabase.from('check_ins').upsert(row);
  } catch (e) {
    console.error('Error inserting check-in to Supabase', e);
  }
}

export async function deleteCheckInSupabase(supabase: SupabaseClient, habitId: string, date: string) {
  try {
    await supabase.from('check_ins').delete().match({ habit_id: habitId, date });
  } catch (e) {
    console.error('Error deleting check-in from Supabase', e);
  }
}

export async function upsertHabitSupabase(supabase: SupabaseClient, habit: Habit) {
  try {
    const row = habitToRow(habit);
    await supabase.from('habits').upsert(row);
  } catch (e) {
    console.error('Error upserting habit to Supabase', e);
  }
}

export async function deleteHabitSupabase(supabase: SupabaseClient, habitId: string) {
  try {
    await supabase.from('habits').delete().eq('id', habitId);
  } catch (e) {
    console.error('Error deleting habit from Supabase', e);
  }
}

export async function upsertStakeSupabase(supabase: SupabaseClient, stake: Stake) {
  try {
    const row = stakeToRow(stake);
    await supabase.from('stakes').upsert(row);
  } catch (e) {
    console.error('Error upserting stake to Supabase', e);
  }
}

export async function deleteStakeSupabase(supabase: SupabaseClient, stakeId: string) {
  try {
    await supabase.from('stakes').delete().eq('id', stakeId);
  } catch (e) {
    console.error('Error deleting stake from Supabase', e);
  }
}

