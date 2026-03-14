-- Add RLS policies for admins to manage service packages

-- Allow admins to insert service packages
CREATE POLICY "Admins can insert service packages"
ON public.service_packages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.auth_user_id = auth.uid()
    AND admin_users.restaurant_id = service_packages.restaurant_id
    AND admin_users.is_active = true
  )
);

-- Allow admins to update service packages
CREATE POLICY "Admins can update service packages"
ON public.service_packages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.auth_user_id = auth.uid()
    AND admin_users.restaurant_id = service_packages.restaurant_id
    AND admin_users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.auth_user_id = auth.uid()
    AND admin_users.restaurant_id = service_packages.restaurant_id
    AND admin_users.is_active = true
  )
);

-- Allow admins to delete service packages
CREATE POLICY "Admins can delete service packages"
ON public.service_packages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.auth_user_id = auth.uid()
    AND admin_users.restaurant_id = service_packages.restaurant_id
    AND admin_users.is_active = true
  )
);

-- Add RLS policies for package_inclusions
CREATE POLICY "Admins can insert package inclusions"
ON public.package_inclusions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.service_packages ON service_packages.restaurant_id = admin_users.restaurant_id
    WHERE admin_users.auth_user_id = auth.uid()
    AND service_packages.id = package_inclusions.package_id
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Admins can update package inclusions"
ON public.package_inclusions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.service_packages ON service_packages.restaurant_id = admin_users.restaurant_id
    WHERE admin_users.auth_user_id = auth.uid()
    AND service_packages.id = package_inclusions.package_id
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Admins can delete package inclusions"
ON public.package_inclusions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.service_packages ON service_packages.restaurant_id = admin_users.restaurant_id
    WHERE admin_users.auth_user_id = auth.uid()
    AND service_packages.id = package_inclusions.package_id
    AND admin_users.is_active = true
  )
);

-- Add RLS policies for package_addons
CREATE POLICY "Admins can insert package addons"
ON public.package_addons
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.service_packages ON service_packages.restaurant_id = admin_users.restaurant_id
    WHERE admin_users.auth_user_id = auth.uid()
    AND service_packages.id = package_addons.package_id
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Admins can update package addons"
ON public.package_addons
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.service_packages ON service_packages.restaurant_id = admin_users.restaurant_id
    WHERE admin_users.auth_user_id = auth.uid()
    AND service_packages.id = package_addons.package_id
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Admins can delete package addons"
ON public.package_addons
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    JOIN public.service_packages ON service_packages.restaurant_id = admin_users.restaurant_id
    WHERE admin_users.auth_user_id = auth.uid()
    AND service_packages.id = package_addons.package_id
    AND admin_users.is_active = true
  )
);
