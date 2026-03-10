// Backend/controllers/adminDatabaseController.js
import { supabaseAdmin } from '../config/supabase.js';

export async function getHealth(req, res) {
  try {
    const { data, error } = await supabaseAdmin.from('db_table_stats').select('*');
    if (error && error.code !== '42P01') throw error;

    res.json({
      tables: data || [],
    });
  } catch (err) {
    console.error('getDatabaseHealth:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch database health' });
  }
}

export async function listJobs(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('maintenance_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error && error.code !== '42P01') throw error;

    res.json({ jobs: data || [] });
  } catch (err) {
    console.error('listMaintenanceJobs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch maintenance jobs' });
  }
}

export async function createJob(req, res) {
  try {
    const { job_key } = req.body || {};
    if (!job_key) {
      return res.status(400).json({ error: 'job_key required' });
    }

    const { data, error } = await supabaseAdmin
      .from('maintenance_jobs')
      .insert({
        job_key,
        status: 'queued',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('createMaintenanceJob:', err);
    res.status(500).json({ error: err.message || 'Failed to enqueue maintenance job' });
  }
}

