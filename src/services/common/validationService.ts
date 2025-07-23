export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

export class ValidationService {
  // Validate email format
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      return {
        isValid: false,
        errors: ["Email is required"],
      };
    }

    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        errors: ["Invalid email format"],
      };
    }

    return { isValid: true };
  }

  // Validate password strength
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push("Password is required");
    } else {
      if (password.length < 6) {
        errors.push("Password must be at least 6 characters long");
      }

      if (!/(?=.*[a-z])/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
      }

      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
      }

      if (!/(?=.*\d)/.test(password)) {
        errors.push("Password must contain at least one number");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate OTP format
  static validateOTP(otp: string): ValidationResult {
    if (!otp) {
      return {
        isValid: false,
        errors: ["OTP is required"],
      };
    }

    if (!/^\d{6}$/.test(otp)) {
      return {
        isValid: false,
        errors: ["OTP must be exactly 6 digits"],
      };
    }

    return { isValid: true };
  }

  // Validate phone number
  static validatePhone(phone: string): ValidationResult {
    if (!phone) {
      return { isValid: true }; // Phone is optional
    }

    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;

    if (!phoneRegex.test(phone)) {
      return {
        isValid: false,
        errors: ["Invalid phone number format"],
      };
    }

    return { isValid: true };
  }

  // Validate user role
  static validateRole(role: string): ValidationResult {
    const validRoles = ["student", "instructor", "shala_owner", "admin"];

    if (!role) {
      return {
        isValid: false,
        errors: ["Role is required"],
      };
    }

    if (!validRoles.includes(role)) {
      return {
        isValid: false,
        errors: [`Invalid role. Must be one of: ${validRoles.join(", ")}`],
      };
    }

    return { isValid: true };
  }

  // Validate pagination parameters
  static validatePagination(page?: number, limit?: number): ValidationResult {
    const errors: string[] = [];

    if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
      errors.push("Page must be a positive integer");
    }

    if (
      limit !== undefined &&
      (limit < 1 || limit > 100 || !Number.isInteger(limit))
    ) {
      errors.push("Limit must be between 1 and 100");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate coordinates
  static validateCoordinates(lat: number, lng: number): ValidationResult {
    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        errors: ["Latitude must be between -90 and 90"],
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        errors: ["Longitude must be between -180 and 180"],
      };
    }

    return { isValid: true };
  }

  // Validate date format
  static validateDate(date: string): ValidationResult {
    if (!date) {
      return {
        isValid: false,
        errors: ["Date is required"],
      };
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return {
        isValid: false,
        errors: ["Invalid date format"],
      };
    }

    return { isValid: true };
  }

  // Validate time format (HH:MM)
  static validateTime(time: string): ValidationResult {
    if (!time) {
      return {
        isValid: false,
        errors: ["Time is required"],
      };
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(time)) {
      return {
        isValid: false,
        errors: ["Time must be in HH:MM format"],
      };
    }

    return { isValid: true };
  }

  // Validate price
  static validatePrice(price: number): ValidationResult {
    if (price === undefined || price === null) {
      return {
        isValid: false,
        errors: ["Price is required"],
      };
    }

    if (price < 0) {
      return {
        isValid: false,
        errors: ["Price must be non-negative"],
      };
    }

    return { isValid: true };
  }

  // Validate multiple fields at once
  static validateMultiple(fields: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    for (const [fieldName, value] of Object.entries(fields)) {
      switch (fieldName) {
        case "email":
          const emailResult = this.validateEmail(value);
          if (!emailResult.isValid) {
            errors.push(...(emailResult.errors || []));
          }
          break;
        case "password":
          const passwordResult = this.validatePassword(value);
          if (!passwordResult.isValid) {
            errors.push(...(passwordResult.errors || []));
          }
          break;
        case "otp":
          const otpResult = this.validateOTP(value);
          if (!otpResult.isValid) {
            errors.push(...(otpResult.errors || []));
          }
          break;
        case "phone":
          const phoneResult = this.validatePhone(value);
          if (!phoneResult.isValid) {
            errors.push(...(phoneResult.errors || []));
          }
          break;
        case "role":
          const roleResult = this.validateRole(value);
          if (!roleResult.isValid) {
            errors.push(...(roleResult.errors || []));
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
