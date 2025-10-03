"use client"

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Loader2, User, Code, Globe, Github, Twitter, Linkedin } from 'lucide-react'
import { toast } from 'sonner'

interface OnboardingData {
  username: string
  display_name: string
  bio: string
  skills: string[]
  github_url: string
  twitter_url: string
  linkedin_url: string
  website_url: string
  role: string
}

const EXPERIENCE_LEVELS = [
  { value: 'student', label: 'Student' },
  { value: 'junior', label: 'Junior Developer (0-2 years)' },
  { value: 'mid', label: 'Mid-level Developer (2-5 years)' },
  { value: 'senior', label: 'Senior Developer (5+ years)' },
  { value: 'lead', label: 'Tech Lead' },
  { value: 'manager', label: 'Engineering Manager' },
  { value: 'founder', label: 'Founder/CTO' },
  { value: 'other', label: 'Other' },
]

const SUGGESTED_SKILLS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java',
  'Go', 'Rust', 'C++', 'Swift', 'Kotlin', 'Flutter', 'React Native',
  'Vue.js', 'Angular', 'Svelte', 'PHP', 'Ruby', 'C#', '.NET',
  'GraphQL', 'REST APIs', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'DevOps', 'CI/CD',
  'Machine Learning', 'AI', 'Data Science', 'Blockchain', 'Web3',
  'UI/UX Design', 'Figma', 'Adobe Creative Suite'
]

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentSkill, setCurrentSkill] = useState('')
  
  const [formData, setFormData] = useState<OnboardingData>({
    username: '',
    display_name: '',
    bio: '',
    skills: [],
    github_url: '',
    twitter_url: '',
    linkedin_url: '',
    website_url: '',
    role: '',
  })

  // Pre-populate form with Clerk data
  useEffect(() => {
    if (isLoaded && user) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        display_name: user.fullName || '',
      }))
    }
  }, [isLoaded, user])

  // Check if user is already onboarded
  useEffect(() => {
    if (isLoaded && user) {
      checkExistingProfile()
    }
  }, [isLoaded, user])

  const checkExistingProfile = async () => {
    try {
      const response = await fetch('/api/profile/check')
      
      if (response.ok) {
        const { exists } = await response.json()
        if (exists) {
          router.push('/select')
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error)
    }
  }

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }))
      setCurrentSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill(currentSkill)
    }
  }

  const validateForm = () => {
    if (!formData.username) {
      toast.error('Username is required')
      return false
    }
    if (formData.username.length < 3) {
      toast.error('Username must be at least 3 characters')
      return false
    }
    if (!formData.display_name) {
      toast.error('Display name is required')
      return false
    }
    if (!formData.role) {
      toast.error('Please select your experience level')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email: user?.primaryEmailAddress?.emailAddress,
          avatar_url: user?.imageUrl,
        })
      })

      if (response.ok) {
        toast.success('Profile created successfully!')
        router.push('/select')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create profile')
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    router.push('/sign-in')
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Dodo Dev! 🚀</h1>
          <p className="text-muted-foreground">
            Let's set up your developer profile to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Complete Your Profile
            </CardTitle>
            <CardDescription>
              Tell us about yourself and your coding journey
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="johndoe"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="display_name">Display Name *</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="role">Experience Level *</Label>
                  <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself, your interests, and what you're working on..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.bio.length}/500 characters
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Skills & Technologies
                </h3>
                
                <div>
                  <Label htmlFor="skills">Add Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      id="skills"
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a skill and press Enter"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addSkill(currentSkill)}
                      disabled={!currentSkill}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Suggested Skills */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Popular skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_SKILLS.slice(0, 12).map((skill) => (
                      <Button
                        key={skill}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSkill(skill)}
                        disabled={formData.skills.includes(skill)}
                        className="h-8"
                      >
                        {skill}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selected Skills */}
                {formData.skills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selected skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeSkill(skill)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Social Links
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="github_url" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </Label>
                    <Input
                      id="github_url"
                      value={formData.github_url}
                      onChange={(e) => handleInputChange('github_url', e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="twitter_url" className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      Twitter/X
                    </Label>
                    <Input
                      id="twitter_url"
                      value={formData.twitter_url}
                      onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="website_url" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input
                      id="website_url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Profile...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}