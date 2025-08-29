"use client";

import { useState } from "react";
import { IntakeSession } from "@/services/TokenService";
import InputField from "./InputField";
import SelectField from "./SelectField";

interface Step1FormProps {
  intakeSession: IntakeSession;
  onComplete: () => void;
}

interface Step1FormData {
  // Business Details Section
  businessName: string; // Legal Business Name* (input_24)
  dba: string; // DBA (input_23) - optional
  businessAddress: string; // Business Address* (input_30)
  businessPhone: string; // Business Phone* (input_31)
  businessEmail: string; // Company Email* (input_33)
  mobile: string; // Mobile* (input_32)
  businessCity: string; // City* (input_28)
  businessState: string; // State* (input_51) - dropdown
  businessZip: string; // Zip* (input_29)
  ownershipPercentage: string; // Percentage of Ownership* (input_40)
  taxId: string; // Tax ID* (input_35)
  stateOfInc: string; // State of Inc* (input_77) - dropdown
  dateBusinessStarted: string; // Date Business Started* (input_78)
  legalEntity: string; // Legal Entity* (input_44) - dropdown
  natureOfBusiness: string; // Nature of Business* (input_80) - dropdown
  hasExistingLoans: string; // Do You Have Any Loans Now* (input_43)
  industry: string; // Enter Your Industry or Product Type* (input_81)
  yearsInBusiness: string; // Years in Business* - new field
  monthlyRevenue: string; // Monthly Gross Revenue* (input_21) - dropdown
  amountNeeded: string; // Amount Requested* (input_22) - dropdown

  // Personal Details Section
  firstName: string; // First Name* (input_14.3)
  lastName: string; // Last Name* (input_59.6)
  dateOfBirth: string; // Date of Birth* (input_79)
  socialSecurity: string; // Social Security* (input_46)
  personalAddress: string; // Address* (input_47)
  personalCity: string; // City* (input_48)
  personalState: string; // State* (input_52) - dropdown
  personalZip: string; // Zip Code* (input_50)

  // Legal Information Section
  legalName: string; // Your legal name* (input_63)
  email: string; // Email Address* (input_17)
}

interface FormErrors {
  [key: string]: string | undefined;
}

// Dropdown options
const US_STATES = [
  { value: "", label: "Select State" },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const LEGAL_ENTITIES = [
  { value: "", label: "Select Legal Entity" },
  { value: "LLC", label: "LLC" },
  { value: "Corporation", label: "Corporation" },
  { value: "Partnership", label: "Partnership" },
  { value: "Sole Proprietorship", label: "Sole Proprietorship" },
  { value: "S-Corp", label: "S-Corp" },
  { value: "C-Corp", label: "C-Corp" },
  { value: "LLP", label: "LLP" },
  { value: "Other", label: "Other" },
];

const NATURE_OF_BUSINESS = [
  { value: "", label: "Select Nature of Business" },
  { value: "Retail", label: "Retail" },
  { value: "Restaurant", label: "Restaurant" },
  { value: "Service", label: "Service" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Construction", label: "Construction" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Technology", label: "Technology" },
  { value: "Transportation", label: "Transportation" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Professional Services", label: "Professional Services" },
  { value: "Other", label: "Other" },
];

const MONTHLY_REVENUE_OPTIONS = [
  { value: "", label: "Select Monthly Revenue" },
  { value: "5000-10000", label: "$5,000 - $10,000" },
  { value: "10000-25000", label: "$10,000 - $25,000" },
  { value: "25000-50000", label: "$25,000 - $50,000" },
  { value: "50000-100000", label: "$50,000 - $100,000" },
  { value: "100000-250000", label: "$100,000 - $250,000" },
  { value: "250000-500000", label: "$250,000 - $500,000" },
  { value: "500000+", label: "$500,000+" },
];

const AMOUNT_REQUESTED_OPTIONS = [
  { value: "", label: "Select Amount Requested" },
  { value: "5000-25000", label: "$5,000 - $25,000" },
  { value: "25000-50000", label: "$25,000 - $50,000" },
  { value: "50000-100000", label: "$50,000 - $100,000" },
  { value: "100000-250000", label: "$100,000 - $250,000" },
  { value: "250000-500000", label: "$250,000 - $500,000" },
  { value: "500000+", label: "$500,000+" },
];

export default function Step1Form({
  intakeSession,
  onComplete,
}: Step1FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Initialize form data with pre-filled values from intake session
  const [formData, setFormData] = useState<Step1FormData>({
    // Business Details Section
    businessName: intakeSession.lead.businessName || "",
    dba: intakeSession.lead.dba || "",
    businessAddress: intakeSession.lead.businessAddress || "",
    businessPhone: intakeSession.lead.businessPhone || "",
    businessEmail: intakeSession.lead.businessEmail || "",
    mobile: intakeSession.lead.mobile || "",
    businessCity: intakeSession.lead.businessCity || "",
    businessState: intakeSession.lead.businessState || "",
    businessZip: intakeSession.lead.businessZip || "",
    ownershipPercentage:
      intakeSession.lead.ownershipPercentage?.toString() || "",
    taxId: intakeSession.lead.taxId || "",
    stateOfInc: intakeSession.lead.stateOfInc || "",
    dateBusinessStarted: intakeSession.lead.dateBusinessStarted || "",
    legalEntity: intakeSession.lead.legalEntity || "",
    natureOfBusiness: intakeSession.lead.natureOfBusiness || "",
    hasExistingLoans: intakeSession.lead.hasExistingLoans || "",
    industry: intakeSession.lead.industry || "",
    yearsInBusiness: intakeSession.lead.yearsInBusiness?.toString() || "",
    monthlyRevenue: intakeSession.lead.monthlyRevenue || "",
    amountNeeded: intakeSession.lead.amountNeeded || "",

    // Personal Details Section
    firstName: intakeSession.lead.firstName || "",
    lastName: intakeSession.lead.lastName || "",
    dateOfBirth: intakeSession.lead.dateOfBirth || "",
    socialSecurity: intakeSession.lead.socialSecurity || "",
    personalAddress: intakeSession.lead.personalAddress || "",
    personalCity: intakeSession.lead.personalCity || "",
    personalState: intakeSession.lead.personalState || "",
    personalZip: intakeSession.lead.personalZip || "",

    // Legal Information Section
    legalName: intakeSession.lead.legalName || "",
    email: intakeSession.lead.email || "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof Step1FormData;

    let formattedValue = value;

    // Format Tax ID as XX-XXXXXXX
    if (fieldName === "taxId") {
      // Remove all non-alphanumeric characters
      const cleaned = value.replace(/[^A-Za-z0-9]/g, "");

      // Format as XX-XXXXXXX (2 characters, dash, 7 characters)
      if (cleaned.length <= 2) {
        formattedValue = cleaned;
      } else if (cleaned.length <= 9) {
        formattedValue = cleaned.slice(0, 2) + "-" + cleaned.slice(2);
      } else {
        formattedValue = cleaned.slice(0, 2) + "-" + cleaned.slice(2, 9);
      }
    }

    // Format zip codes as 12345 or 12345-6789
    if (fieldName === "businessZip" || fieldName === "personalZip") {
      // Remove all non-digit characters
      const cleaned = value.replace(/\D/g, "");

      // Format as 12345 or 12345-6789
      if (cleaned.length <= 5) {
        formattedValue = cleaned;
      } else if (cleaned.length <= 9) {
        formattedValue = cleaned.slice(0, 5) + "-" + cleaned.slice(5);
      } else {
        formattedValue = cleaned.slice(0, 5) + "-" + cleaned.slice(5, 9);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [fieldName]: formattedValue,
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    const requiredFields: (keyof Step1FormData)[] = [
      "businessName",
      "businessAddress",
      "businessPhone",
      "businessEmail",
      "mobile",
      "businessCity",
      "businessState",
      "businessZip",
      "ownershipPercentage",
      "taxId",
      "stateOfInc",
      "dateBusinessStarted",
      "legalEntity",
      "natureOfBusiness",
      "hasExistingLoans",
      "industry",
      "yearsInBusiness",
      "monthlyRevenue",
      "amountNeeded",
      "firstName",
      "lastName",
      "dateOfBirth",
      "socialSecurity",
      "personalAddress",
      "personalCity",
      "personalState",
      "personalZip",
      "legalName",
      "email",
    ];

    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === "") {
        newErrors[field] = "This field is required";
      }
    });

    // Email validation
    const emailRegex = /^[^'''\s@]+@[^'''\s@]+\.[^'''\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (formData.businessEmail && !emailRegex.test(formData.businessEmail)) {
      newErrors.businessEmail = "Please enter a valid email address";
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s\-\(\)\+\.]{10,}$/;
    if (formData.businessPhone && !phoneRegex.test(formData.businessPhone)) {
      newErrors.businessPhone = "Please enter a valid phone number";
    }
    if (formData.mobile && !phoneRegex.test(formData.mobile)) {
      newErrors.mobile = "Please enter a valid mobile number";
    }

    // Ownership percentage validation
    if (formData.ownershipPercentage) {
      const percentage = parseFloat(formData.ownershipPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        newErrors.ownershipPercentage =
          "Please enter a valid percentage (0-100)";
      }
    }

    // Years in business validation
    if (formData.yearsInBusiness) {
      const years = parseInt(formData.yearsInBusiness);
      if (isNaN(years) || years < 0 || years > 100) {
        newErrors.yearsInBusiness =
          "Please enter a valid number of years (0-100)";
      }
    }

    // Tax ID validation (XX-XXXXXXX format)
    if (formData.taxId) {
      const taxIdRegex = /^[A-Za-z0-9]{2}-[A-Za-z0-9]{7}$/;
      if (!taxIdRegex.test(formData.taxId)) {
        newErrors.taxId = "Please enter Tax ID in format XX-XXXXXXX";
      }
    }

    // Zip code validation (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (formData.businessZip && !zipRegex.test(formData.businessZip)) {
      newErrors.businessZip =
        "Please enter a valid zip code (e.g., 12345 or 12345-6789)";
    }
    if (formData.personalZip && !zipRegex.test(formData.personalZip)) {
      newErrors.personalZip =
        "Please enter a valid zip code (e.g., 12345 or 12345-6789)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/intake/${intakeSession.token}/step1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);

        // Handle specific validation errors
        if (errorData.missingFields) {
          alert(
            `Please fill in the following required fields: ${errorData.missingFields.join(
              ", "
            )}`
          );
        } else {
          alert(errorData.error || "Failed to save step 1 data");
        }
        return;
      }

      onComplete();
    } catch (error) {
      console.error("Error submitting step 1:", error);
      alert("There was an error saving your information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Business Funding Application
          </h2>
          <p className="mt-2 text-xs text-gray-600">
            Please provide your business and personal information. Fields marked
            with <span className="text-red-500">*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Business Details Section */}
          <div className="border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2">
              Business Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="businessName"
                label="Legal Business Name"
                value={formData.businessName}
                onChange={handleInputChange}
                error={errors.businessName}
                required
              />
              <InputField
                id="dba"
                label="DBA (Doing Business As)"
                value={formData.dba}
                onChange={handleInputChange}
                error={errors.dba}
              />
              <InputField
                id="businessAddress"
                label="Business Address"
                value={formData.businessAddress}
                onChange={handleInputChange}
                error={errors.businessAddress}
                required
                className="md:col-span-2"
              />
              <InputField
                id="businessCity"
                label="City"
                value={formData.businessCity}
                onChange={handleInputChange}
                error={errors.businessCity}
                required
              />
              <SelectField
                id="businessState"
                label="State"
                value={formData.businessState}
                onChange={handleInputChange}
                options={US_STATES}
                error={errors.businessState}
                required
              />
              <InputField
                id="businessZip"
                label="Zip Code"
                value={formData.businessZip}
                onChange={handleInputChange}
                error={errors.businessZip}
                placeholder="12345"
                required
              />
              <InputField
                id="businessPhone"
                label="Business Phone"
                type="tel"
                value={formData.businessPhone}
                onChange={handleInputChange}
                error={errors.businessPhone}
                required
              />
              <InputField
                id="mobile"
                label="Mobile"
                type="tel"
                value={formData.mobile}
                onChange={handleInputChange}
                error={errors.mobile}
                required
              />
              <InputField
                id="businessEmail"
                label="Company Email"
                type="email"
                value={formData.businessEmail}
                onChange={handleInputChange}
                error={errors.businessEmail}
                required
              />
              <InputField
                id="ownershipPercentage"
                label="Percentage of Ownership"
                type="number"
                min="0"
                max="100"
                value={formData.ownershipPercentage}
                onChange={handleInputChange}
                error={errors.ownershipPercentage}
                required
              />
              <InputField
                id="taxId"
                label="Tax ID"
                value={formData.taxId}
                onChange={handleInputChange}
                error={errors.taxId}
                placeholder="XX-XXXXXXX"
                required
              />
              <SelectField
                id="stateOfInc"
                label="State of Incorporation"
                value={formData.stateOfInc}
                onChange={handleInputChange}
                options={US_STATES}
                error={errors.stateOfInc}
                required
              />
              <InputField
                id="dateBusinessStarted"
                label="Date Business Started"
                type="date"
                value={formData.dateBusinessStarted}
                onChange={handleInputChange}
                error={errors.dateBusinessStarted}
                required
              />
              <SelectField
                id="legalEntity"
                label="Legal Entity"
                value={formData.legalEntity}
                onChange={handleInputChange}
                options={LEGAL_ENTITIES}
                error={errors.legalEntity}
                required
              />
              <SelectField
                id="natureOfBusiness"
                label="Nature of Business"
                value={formData.natureOfBusiness}
                onChange={handleInputChange}
                options={NATURE_OF_BUSINESS}
                error={errors.natureOfBusiness}
                required
              />
              <SelectField
                id="hasExistingLoans"
                label="Do You Have Any Loans Now?"
                value={formData.hasExistingLoans}
                onChange={handleInputChange}
                options={[
                  { value: "", label: "Select Option" },
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
                error={errors.hasExistingLoans}
                required
              />
              <InputField
                id="industry"
                label="Enter Your Industry or Product Type"
                value={formData.industry}
                onChange={handleInputChange}
                error={errors.industry}
                required
              />
              <InputField
                id="yearsInBusiness"
                label="Years in Business"
                type="number"
                min="0"
                max="100"
                value={formData.yearsInBusiness}
                onChange={handleInputChange}
                error={errors.yearsInBusiness}
                required
              />
              <SelectField
                id="monthlyRevenue"
                label="Monthly Gross Revenue"
                value={formData.monthlyRevenue}
                onChange={handleInputChange}
                options={MONTHLY_REVENUE_OPTIONS}
                error={errors.monthlyRevenue}
                required
              />
              <SelectField
                id="amountNeeded"
                label="Amount Requested"
                value={formData.amountNeeded}
                onChange={handleInputChange}
                options={AMOUNT_REQUESTED_OPTIONS}
                error={errors.amountNeeded}
                required
              />
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                error={errors.firstName}
                required
              />
              <InputField
                id="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                error={errors.lastName}
                required
              />
              <InputField
                id="dateOfBirth"
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                error={errors.dateOfBirth}
                required
              />
              <InputField
                id="socialSecurity"
                label="Social Security Number"
                value={formData.socialSecurity}
                onChange={handleInputChange}
                error={errors.socialSecurity}
                placeholder="XXX-XX-XXXX"
                required
              />
              <InputField
                id="personalAddress"
                label="Personal Address"
                value={formData.personalAddress}
                onChange={handleInputChange}
                error={errors.personalAddress}
                required
                className="md:col-span-2"
              />
              <InputField
                id="personalCity"
                label="Personal City"
                value={formData.personalCity}
                onChange={handleInputChange}
                error={errors.personalCity}
                required
              />
              <SelectField
                id="personalState"
                label="State"
                value={formData.personalState}
                onChange={handleInputChange}
                options={US_STATES}
                error={errors.personalState}
                required
              />
              <InputField
                id="personalZip"
                label="Zip Code"
                value={formData.personalZip}
                onChange={handleInputChange}
                error={errors.personalZip}
                placeholder="12345"
                required
              />
            </div>
          </div>

          {/* Legal Information Section */}
          <div className="border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2">
              Legal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="legalName"
                label="Your Legal Name"
                value={formData.legalName}
                onChange={handleInputChange}
                error={errors.legalName}
                required
              />
              <InputField
                id="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Continue to Step 2"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
