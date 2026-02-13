import { insforge, getAuthenticatedClient } from './insforge';
import type { IStorage } from './storage-interface';

/**
 * Insforge Storage Service
 * Implements IStorage interface using Insforge database SDK instead of Drizzle ORM
 */
export class InsforgeStorageService implements IStorage {
  private getClient(accessToken?: string) {
    return accessToken ? getAuthenticatedClient(accessToken) : insforge;
  }

  // User methods
  async getUser(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('users')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async getUserByEmail(email: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('users')
      .select()
      .eq('email', email)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createUser(user: any, accessToken?: string): Promise<any> {
    // Note: User creation is handled by Insforge auth, this is for additional user data
    const { data, error } = await this.getClient(accessToken).database
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data;
  }

  async updateUser(id: string, user: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('users')
      .update(user)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  // Service History methods
  async getServiceHistory(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('service_history')
      .select()
      .eq('user_id', userId)
      .order('date_entered', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getServiceHistoryById(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('service_history')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createServiceHistory(history: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('service_history')
      .insert([history])
      .select()
      .single();

    if (error) throw new Error(`Failed to create service history: ${error.message}`);
    return data;
  }

  async updateServiceHistory(id: string, history: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('service_history')
      .update(history)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteServiceHistory(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('service_history')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete service history: ${error.message}`);
  }

  // Medical Conditions methods
  async getMedicalConditions(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('medical_conditions')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getMedicalConditionById(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('medical_conditions')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createMedicalCondition(condition: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('medical_conditions')
      .insert([condition])
      .select()
      .single();

    if (error) throw new Error(`Failed to create medical condition: ${error.message}`);
    return data;
  }

  async updateMedicalCondition(id: string, condition: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('medical_conditions')
      .update(condition)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteMedicalCondition(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('medical_conditions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete medical condition: ${error.message}`);
  }

  // Claims methods
  async getClaims(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('claims')
      .select()
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getClaim(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('claims')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createClaim(claim: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('claims')
      .insert([claim])
      .select()
      .single();

    if (error) throw new Error(`Failed to create claim: ${error.message}`);
    return data;
  }

  async updateClaim(id: string, claim: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('claims')
      .update({ ...claim, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteClaim(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('claims')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete claim: ${error.message}`);
  }

  // Lay Statements methods
  async getLayStatements(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('lay_statements')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getLayStatementById(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('lay_statements')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async getLayStatementsByClaim(claimId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('lay_statements')
      .select()
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async createLayStatement(statement: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('lay_statements')
      .insert([statement])
      .select()
      .single();

    if (error) throw new Error(`Failed to create lay statement: ${error.message}`);
    return data;
  }

  async updateLayStatement(id: string, statement: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('lay_statements')
      .update({ ...statement, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteLayStatement(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('lay_statements')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete lay statement: ${error.message}`);
  }

  // Buddy Statements methods
  async getBuddyStatements(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('buddy_statements')
      .select()
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getBuddyStatementById(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('buddy_statements')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async getBuddyStatementsByClaim(claimId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('buddy_statements')
      .select()
      .eq('claim_id', claimId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async createBuddyStatement(statement: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('buddy_statements')
      .insert([statement])
      .select()
      .single();

    if (error) throw new Error(`Failed to create buddy statement: ${error.message}`);
    return data;
  }

  async updateBuddyStatement(id: string, statement: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('buddy_statements')
      .update(statement)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteBuddyStatement(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('buddy_statements')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete buddy statement: ${error.message}`);
  }

  // Documents methods
  async getDocuments(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('documents')
      .select()
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getDocumentById(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('documents')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async getDocumentsByClaim(claimId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('documents')
      .select()
      .eq('claim_id', claimId)
      .order('uploaded_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async createDocument(document: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('documents')
      .insert([document])
      .select()
      .single();

    if (error) throw new Error(`Failed to create document: ${error.message}`);
    return data;
  }

  async deleteDocument(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete document: ${error.message}`);
  }

  // Appeals methods
  async getAppeals(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('appeals')
      .select()
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getAppeal(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('appeals')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createAppeal(appeal: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('appeals')
      .insert([appeal])
      .select()
      .single();

    if (error) throw new Error(`Failed to create appeal: ${error.message}`);
    return data;
  }

  async updateAppeal(id: string, appeal: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('appeals')
      .update({ ...appeal, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteAppeal(id: string, accessToken?: string): Promise<void> {
    const { error } = await this.getClient(accessToken).database
      .from('appeals')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete appeal: ${error.message}`);
  }

  // Referral methods
  async getReferrals(userId: string, accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('referrals')
      .select()
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getReferralById(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('referrals')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async getReferralByCode(code: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('referrals')
      .select()
      .eq('referral_code', code)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createReferral(referral: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('referrals')
      .insert([referral])
      .select()
      .single();

    if (error) throw new Error(`Failed to create referral: ${error.message}`);
    return data;
  }

  async updateReferral(id: string, referral: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('referrals')
      .update(referral)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async deleteReferral(id: string, accessToken?: string): Promise<boolean> {
    const { data, error } = await this.getClient(accessToken).database
      .from('referrals')
      .delete()
      .eq('id', id)
      .select();

    if (error) return false;
    return (data?.length || 0) > 0;
  }

  async getReferralStats(userId: string, accessToken?: string): Promise<{ total: number; converted: number; rewards: number }> {
    const referrals = await this.getReferrals(userId, accessToken);
    const converted = referrals.filter((r: any) => r.status === 'registered' || r.status === 'claimed_filed' || r.status === 'rewarded');
    const totalRewards = referrals.reduce((sum: number, r: any) => sum + (r.reward_amount || 0), 0);
    return { total: referrals.length, converted: converted.length, rewards: totalRewards };
  }

  // Consultation methods
  async getConsultations(userId?: string, accessToken?: string): Promise<any[]> {
    const query = this.getClient(accessToken).database
      .from('consultations')
      .select()
      .order('scheduled_date', { ascending: false });

    if (userId) {
      query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  async getConsultation(id: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('consultations')
      .select()
      .eq('id', id)
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async createConsultation(consultation: any, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('consultations')
      .insert([consultation])
      .select()
      .single();

    if (error) throw new Error(`Failed to create consultation: ${error.message}`);
    return data;
  }

  async updateConsultation(id: string, consultation: Partial<any>, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('consultations')
      .update(consultation)
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return data || undefined;
  }

  async cancelConsultation(id: string, accessToken?: string): Promise<any> {
    return this.updateConsultation(id, { status: 'cancelled' }, accessToken);
  }

  // Site Stats methods
  async getStat(key: string, accessToken?: string): Promise<number> {
    const { data, error } = await this.getClient(accessToken).database
      .from('site_stats')
      .select('value')
      .eq('key', key)
      .single();

    if (error) return 0;
    return data?.value ?? 0;
  }

  async incrementStat(key: string, accessToken?: string): Promise<number> {
    // Get current value
    const currentValue = await this.getStat(key, accessToken);
    const newValue = currentValue + 1;

    // Update or insert (PostgREST doesn't have upsert, so we try update first, then insert)
    const { data: updateData, error: updateError } = await this.getClient(accessToken).database
      .from('site_stats')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();

    if (updateError || !updateData) {
      // If update failed, try insert
      const { data: insertData, error: insertError } = await this.getClient(accessToken).database
        .from('site_stats')
        .insert([{ key, value: newValue }])
        .select()
        .single();

      if (insertError) throw new Error(`Failed to increment stat: ${insertError.message}`);
      return insertData?.value ?? newValue;
    }

    return updateData?.value ?? newValue;
  }

  async initializeStat(key: string, value: number, accessToken?: string): Promise<void> {
    const existing = await this.getStat(key, accessToken);
    if (existing === 0) {
      const { error } = await this.getClient(accessToken).database
        .from('site_stats')
        .insert([{ key, value }]);

      if (error) throw new Error(`Failed to initialize stat: ${error.message}`);
    }
  }

  // Stripe methods - query from stripe schema
  async getStripeProducts(accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('stripe.products')
      .select()
      .eq('active', true)
      .order('created', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getStripePrices(accessToken?: string): Promise<any[]> {
    const { data, error } = await this.getClient(accessToken).database
      .from('stripe.prices')
      .select()
      .eq('active', true)
      .order('created', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getStripeProduct(productId: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('stripe.products')
      .select()
      .eq('id', productId)
      .single();

    if (error) return null;
    return data || null;
  }

  async getStripeSubscription(subscriptionId: string, accessToken?: string): Promise<any> {
    const { data, error } = await this.getClient(accessToken).database
      .from('stripe.subscriptions')
      .select()
      .eq('id', subscriptionId)
      .single();

    if (error) return null;
    return data || null;
  }
}
