import crypto from "crypto";
import supabase from "../config/supabaseCilent.js";



// Find by email
export const findUserByEmail = async (email) => {
    const { data, error } = await supabase
        .from("User")
        .select("*")
        .eq("email", email)
        .maybeSingle();

    if (error) throw error;
    return data;
};

// Find by id
export const findUserById = async (id) => {
    const { data, error } = await supabase
        .from("User")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
};

// Create user
export const createUser = async (userData) => {
    const { data, error } = await supabase
        .from("User")
        .insert([{ id: crypto.randomUUID(), ...userData, updated_at: new Date() }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Update user
export const updateUser = async (id, updateData) => {
    const { data, error } = await supabase
        .from("User")
        .update({ ...updateData, updated_at: new Date() })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
};
