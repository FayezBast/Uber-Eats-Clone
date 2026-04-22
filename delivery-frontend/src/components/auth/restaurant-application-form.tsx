"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

export function RestaurantApplicationForm() {
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [approvedState, setApprovedState] = useState(false);

  const errors = {
    ownerName: !ownerName.trim() ? "Owner name is required." : "",
    email: /\S+@\S+\.\S+/.test(email) ? "" : "Enter a valid email address.",
    phone: phone.trim() ? "" : "Phone number is required.",
    restaurantName: restaurantName.trim() ? "" : "Restaurant name is required.",
    cuisine: cuisine.trim() ? "" : "Cuisine or concept is required.",
    address: address.trim() ? "" : "Address is required.",
    city: city.trim() ? "" : "City is required."
  };

  const hasErrors = Object.values(errors).some(Boolean);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (hasErrors) return;

    setApprovedState(true);
  }

  if (approvedState) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Application received</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We received the application for {restaurantName}. The restaurant account will stay pending
          until the team reviews the business details and approves access.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{restaurantName}</p>
          <p className="mt-1">Owner: {ownerName}</p>
          <p className="mt-1">Email: {email}</p>
          <p className="mt-1">City: {city}</p>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Already approved?{" "}
          <Link href="/auth/restaurant/sign-in" className="font-medium text-foreground underline">
            Restaurant sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="owner-name"
          label="Owner name"
          value={ownerName}
          onChange={setOwnerName}
          placeholder="Your full name"
          error={submitted ? errors.ownerName : ""}
        />
        <Field
          id="business-email"
          label="Business email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@example.com"
          error={submitted ? errors.email : ""}
        />
        <Field
          id="phone"
          label="Phone number"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="Phone number"
          error={submitted ? errors.phone : ""}
        />
        <Field
          id="restaurant-name"
          label="Restaurant name"
          value={restaurantName}
          onChange={setRestaurantName}
          placeholder="Restaurant name"
          error={submitted ? errors.restaurantName : ""}
        />
        <Field
          id="cuisine"
          label="Cuisine or concept"
          value={cuisine}
          onChange={setCuisine}
          placeholder="Burgers, sushi, bakery..."
          error={submitted ? errors.cuisine : ""}
        />
        <Field
          id="address"
          label="Restaurant address"
          value={address}
          onChange={setAddress}
          placeholder="Street and area"
          error={submitted ? errors.address : ""}
        />
        <Field
          id="city"
          label="City"
          value={city}
          onChange={setCity}
          placeholder="City"
          error={submitted ? errors.city : ""}
        />

        <div className="space-y-2">
          <label htmlFor="restaurant-description" className="text-sm font-medium text-foreground">
            Restaurant details
          </label>
          <textarea
            id="restaurant-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Menu style, opening hours, or anything the review team should know"
            className="min-h-[110px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-5 py-3 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Submit for approval
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an approved account?{" "}
        <Link href="/auth/restaurant/sign-in" className="font-medium text-foreground underline">
          Restaurant sign in
        </Link>
      </p>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-ring"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
