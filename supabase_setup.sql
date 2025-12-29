-- Run this script in your Supabase SQL Editor to fix the permission errors

-- 1. Setup Storage for Cover Photos
-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
select 'store-assets', 'store-assets', true
where not exists (
    select 1 from storage.buckets where id = 'store-assets'
);

-- Allow public access to view files (so cover photos are visible)
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'store-assets' );

-- Allow authenticated users to upload files
drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'store-assets' and auth.role() = 'authenticated' );

-- Allow users to update/delete their own files
drop policy if exists "Users can update their own files" on storage.objects;
create policy "Users can update their own files"
  on storage.objects for update
  using ( bucket_id = 'store-assets' and auth.uid() = owner );

drop policy if exists "Users can delete their own files" on storage.objects;
create policy "Users can delete their own files"
  on storage.objects for delete
  using ( bucket_id = 'store-assets' and auth.uid() = owner );

-- 2. Setup Store Settings Table (Required for saving the photo URL)
create table if not exists public.store_settings (
  user_id uuid references auth.users not null primary key,
  store_name text,
  store_description text,
  cover_photo text,
  wishlist text[],
  saved_card jsonb,
  template text default 'classic-red',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add template column to existing tables if it doesn't exist
alter table public.store_settings add column if not exists template text default 'classic-red';

alter table public.store_settings enable row level security;

drop policy if exists "Users can manage their own settings" on public.store_settings;
create policy "Users can manage their own settings"
  on public.store_settings for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 3. Setup Products Table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric not null,
  sale_price numeric,
  images text[],
  stock integer default 0,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  user_id uuid references auth.users
);

alter table public.products enable row level security;

drop policy if exists "Public can view products" on public.products;
create policy "Public can view products" on public.products for select using (true);
drop policy if exists "Sellers can manage own products" on public.products;
create policy "Sellers can manage own products" on public.products for all 
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Setup Orders Table
-- WARNING: This recreates the table to fix any schema/permission issues
drop table if exists public.orders cascade;
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  items jsonb,
  total numeric,
  status text default 'paid',
  customer_info jsonb,
  discount numeric default 0,
  payment_method text,
  payment_reference text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;

-- Allow authenticated users (sellers) to view all orders
create policy "Authenticated users can view all orders" on public.orders for select using (auth.role() = 'authenticated');
create policy "Users can create orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Authenticated users can update orders" on public.orders for update using (auth.role() = 'authenticated');

-- 5. Setup Reviews Table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products(id) on delete cascade,
  author text,
  rating integer,
  text text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.reviews enable row level security;

drop policy if exists "Public can view reviews" on public.reviews;
create policy "Public can view reviews" on public.reviews for select using (true);
drop policy if exists "Authenticated users can create reviews" on public.reviews;
create policy "Authenticated users can create reviews" on public.reviews for insert with check (auth.role() = 'authenticated');

-- 6. Setup Cart Table
-- Note: We use a separate primary key 'row_id' because 'id' is used by your code to store the product_id
create table if not exists public.cart (
  row_id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  id text, -- This stores the product ID based on your code logic
  name text,
  price numeric,
  image text,
  quantity integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.cart enable row level security;

drop policy if exists "Users can manage own cart" on public.cart;
create policy "Users can manage own cart" on public.cart for all using (auth.uid() = user_id);

-- 7. Secure Function to Decrement Stock
-- This allows buyers to update stock without having full edit permissions on the product
create or replace function decrement_stock(product_id uuid, quantity_to_subtract integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock = stock - quantity_to_subtract
  where id = product_id
  and stock >= quantity_to_subtract;
end;
$$;

-- 8. Secure Function to Place Order (Validates Stock & Calculates Total)
create or replace function place_order(
  user_id uuid,
  items_json jsonb,
  shipping_info jsonb,
  payment_method text,
  payment_reference text,
  shipping_cost numeric,
  order_note text,
  coupon_code text
) returns uuid as $$
declare
  order_id uuid;
  item record;
  product_record record;
  calculated_total numeric := 0;
  item_total numeric;
  discount_val numeric := 0;
  tax_rate numeric := 0.075; -- 7.5%
begin
  -- 1. Calculate Total & Validate Stock
  for item in select * from jsonb_to_recordset(items_json) as x(id uuid, quantity int)
  loop
    select * into product_record from products where id = item.id;
    
    if not found then
      raise exception 'Product % not found', item.id;
    end if;
    
    if product_record.stock < item.quantity then
      raise exception 'Insufficient stock for %', product_record.name;
    end if;
    
    -- Use sale_price if valid, otherwise price
    if product_record.sale_price is not null and product_record.sale_price > 0 and product_record.sale_price < product_record.price then
      item_total := product_record.sale_price * item.quantity;
    else
      item_total := product_record.price * item.quantity;
    end if;
    
    calculated_total := calculated_total + item_total;
  end loop;

  -- 2. Add Tax & Shipping (Discount logic can be expanded here)
  calculated_total := (calculated_total * (1 - discount_val)) + (calculated_total * (1 - discount_val) * tax_rate) + shipping_cost;

  -- 3. Create Order
  insert into orders (user_id, items, total, customer_info, payment_method, payment_reference, status, discount, created_at)
  values (user_id, items_json, calculated_total, shipping_info, payment_method, payment_reference, case when payment_method = 'card' then 'paid' else 'pending' end, discount_val, now())
  returning id into order_id;

  -- 4. Deduct Stock
  for item in select * from jsonb_to_recordset(items_json) as x(id uuid, quantity int)
  loop
    update products set stock = stock - item.quantity where id = item.id;
  end loop;

  return order_id;
end;
$$ language plpgsql security definer;

-- 9. Setup Withdrawals Table
create table if not exists public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  amount numeric not null,
  bank_name text,
  account_number text,
  account_name text,
  status text default 'pending', -- pending, processed, rejected
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.withdrawals enable row level security;

drop policy if exists "Users can manage own withdrawals" on public.withdrawals;
create policy "Users can manage own withdrawals" on public.withdrawals for all using (auth.uid() = user_id);

-- 10. Helper Function to Calculate Balance
create or replace function get_seller_balance(target_user_id uuid)
returns numeric
language plpgsql
security definer
as $$
declare
  total_revenue numeric;
  total_withdrawn numeric;
begin
  -- Calculate revenue from paid/completed orders
  select coalesce(sum(total), 0) into total_revenue from public.orders where user_id = target_user_id and status in ('paid', 'shipped', 'delivered');
  -- Calculate total withdrawals (pending or processed)
  select coalesce(sum(amount), 0) into total_withdrawn from public.withdrawals where user_id = target_user_id and status in ('pending', 'processed');
  
  return total_revenue - total_withdrawn;
end;
$$;