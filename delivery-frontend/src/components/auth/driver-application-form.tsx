"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

export function DriverApplicationForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [vehicleType, setVehicleType] = useState("bike");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [experience, setExperience] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [approvedState, setApprovedState] = useState(false);

  const errors = {
    fullName: fullName.trim() ? "" : "Full name is required.",
    email: /\S+@\S+\.\S+/.test(email) ? "" : "Enter a valid email address.",
    phone: phone.trim() ? "" : "Phone number is required.",
    city: city.trim() ? "" : "City is required.",
    licenseNumber: licenseNumber.trim() ? "" : "License number is required.",
    experience: experience.trim() ? "" : "Experience is required."
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
          Your driver application is pending review. We will verify the details and enable sign-in
          after approval.
        </p>
        <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{fullName}</p>
          <p className="mt-1">Vehicle: {vehicleLabel(vehicleType)}</p>
          <p className="mt-1">City: {city}</p>
          <p className="mt-1">Email: {email}</p>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Approved already?{" "}
          <Link href="/auth/driver/sign-in" className="font-medium text-foreground underline">
            Driver sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="full-name"
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Your full name"
          error={submitted ? errors.fullName : ""}
        />
        <Field
          id="driver-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@example.com"
          error={submitted ? errors.email : ""}
        />
        <Field
          id="driver-phone"
          label="Phone number"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="Phone number"
          error={submitted ? errors.phone : ""}
        />
        <Field
          id="driver-city"
          label="City"
          value={city}
          onChange={setCity}
          placeholder="City"
          error={submitted ? errors.city : ""}
        />

        <div className="space-y-2">
          <label htmlFor="vehicle-type" className="text-sm font-medium text-foreground">
            Vehicle type
          </label>
          <select
            id="vehicle-type"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-ring"
          >
            <option value="bike">Bike</option>
            <option value="scooter">Scooter</option>
            <option value="car">Car</option>
          </select>
        </div>

        <Field
          id="license-number"
          label="License number"
          value={licenseNumber}
          onChange={setLicenseNumber}
          placeholder="License number"
          error={submitted ? errors.licenseNumber : ""}
        />
        <Field
          id="experience"
          label="Delivery experience"
          value={experience}
          onChange={setExperience}
          placeholder="Example: 2 years"
          error={submitted ? errors.experience : ""}
        />

        <div className="space-y-2">
          <label htmlFor="driver-notes" className="text-sm font-medium text-foreground">
            Additional notes
          </label>
          <textarea
            id="driver-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Availability, zones, or anything useful for review"
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
        Already approved?{" "}
        <Link href="/auth/driver/sign-in" className="font-medium text-foreground underline">
          Driver sign in
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

function vehicleLabel(value: string) {
  switch (value) {
    case "scooter":
      return "Scooter";
    case "car":
      return "Car";
    default:
      return "Bike";
  }
}
