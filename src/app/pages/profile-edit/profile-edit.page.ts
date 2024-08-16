 import { Component, OnInit } from '@angular/core';
 import { Router } from '@angular/router';
 import { AngularFireAuth } from '@angular/fire/compat/auth';
 import { AngularFireStorage } from '@angular/fire/compat/storage';
 import { ModalController } from '@ionic/angular';
 import { finalize } from 'rxjs/operators';
 import { AlertController } from '@ionic/angular';
 import { ProfileService } from 'src/app/services/profile.service';
 import { PhotoService } from 'src/app/services/photo.service';
 import { LoadingModalComponent } from 'src/app/components/loading-modal/loading-modal.component';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  styleUrls: ['./profile-edit.page.scss'],
})
export class ProfileEditPage implements OnInit {
  user: any = {};
  newName!: string;
  newEmail!: string;
  selectedFile: File | null = null;
  photoURL: string | null = null;

  photos: string[] = [];
  showPhotos: boolean = false;

  constructor(
    private afAuth: AngularFireAuth,
    private afStorage: AngularFireStorage,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private router: Router,
    private profileService: ProfileService,
    private photoService: PhotoService
  ) {}

  ngOnInit() {
    this.loadUser();
    this.loadPhotos();
  }

  async takePhoto() {

    const modal = await this.modalCtrl.create({
      component: LoadingModalComponent
      });
      await modal.present();

    try {

      // Captura la foto usando PhotoService
      const image = await this.photoService.addPhoto();
  
      if (image) {
        // Convierte la imagen a un blob
        const imageBlob = this.dataURLtoBlob(image.dataUrl);
  
        // Define el path del archivo
        const user = await this.afAuth.currentUser;
        if (user) {
          const filePath = `profile_pictures/${user.uid}/${new Date().getTime()}.jpg`;
          const fileRef = this.afStorage.ref(filePath);
          const task = this.afStorage.upload(filePath, imageBlob);
  
          // Espera a que la subida termine
          await new Promise<void>((resolve, reject) => {
            task.snapshotChanges().pipe(
              finalize(async () => {
                try {
                  const downloadURL = await fileRef.getDownloadURL().toPromise();
                  await user.updateProfile({ photoURL: downloadURL });
                  this.photoURL = downloadURL;
                  resolve();
                } catch (error) {
                  reject(error);
                }
              })
            ).subscribe();
          });
  
          // Actualiza la vista
          this.photoURL = image.dataUrl;
        }
      } else {
        console.warn('No se tomó ninguna foto.');
      }
  
    } catch (error) {
            console.error('Error al tomar la foto:', error);
             await this.showAlert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
           } finally {
            await modal.dismiss();
          }
        }

  loadPhotos() {
    this.photoService.listPhotos().subscribe((urls: string[]) => {
      this.photos = urls;
    });
  }

  async loadUser() {
    const user = await this.afAuth.currentUser;
    if (user) {
      this.user = user;
      this.newName = user.displayName || '';
      this.newEmail = user.email || '';
      this.photoURL = user.photoURL || '';
    }
  }

  async updateProfile() {
    try {
      const user = await this.afAuth.currentUser;
      if (user) {
        if (this.newName !== user.displayName) {
          await user.updateProfile({ displayName: this.newName });
        }
        if (this.newEmail !== user.email) {
          await user.updateEmail(this.newEmail);
        }
        if (this.selectedFile) {
          await this.uploadProfilePicture(user);
        }
        this.profileService.updateProfile(user); // Notifica al servicio sobre el cambio
        await this.showAlert('Éxito', 'Perfil actualizado correctamente.');
        this.router.navigate(['/home']); // Redirige al home
      }
    } catch (error) {
      await this.showAlert('Error', 'No se pudo actualizar el perfil. Intenta de nuevo.');
    }
  }

  async uploadProfilePicture(user: any) {
    if (!this.selectedFile) return;
    
    const filePath = `profile_pictures/${user.uid}/${this.selectedFile.name}`;
    const fileRef = this.afStorage.ref(filePath);
    const task = this.afStorage.upload(filePath, this.selectedFile);

    return new Promise<void>((resolve, reject) => {
      task.snapshotChanges().pipe(
        finalize(async () => {
          try {
            const downloadURL = await fileRef.getDownloadURL().toPromise();
            await user.updateProfile({ photoURL: downloadURL });
            this.photoURL = downloadURL;
            resolve();
          } catch (error) {
            reject(error);
          }
        })
      ).subscribe();
    });
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }

  async handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
  
      const modal = await this.modalCtrl.create({
        component: LoadingModalComponent
      });
      await modal.present();
  
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoURL = e.target.result;
      };
      reader.readAsDataURL(this.selectedFile);
  
      setTimeout(async () => {
        await modal.dismiss();
      }, 3000);
    }
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  private dataURLtoBlob(dataURL: string): Blob {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }
}


// import { Component, OnInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { AngularFireAuth } from '@angular/fire/compat/auth';
// import { AngularFireStorage } from '@angular/fire/compat/storage';
// import { ModalController } from '@ionic/angular';
// import { finalize } from 'rxjs/operators';
// import { AlertController } from '@ionic/angular';
// import { ProfileService } from 'src/app/services/profile.service';
// import { PhotoService } from 'src/app/services/photo.service';
// import { LoadingModalComponent } from 'src/app/components/loading-modal/loading-modal.component';

// @Component({
//   selector: 'app-profile-edit',
//   templateUrl: './profile-edit.page.html',
//   styleUrls: ['./profile-edit.page.scss'],
// })
// export class ProfileEditPage implements OnInit {
//   user: any = {};
//   newName!: string;
//   newEmail!: string;
//   selectedFile: File | null = null;
//   photoURL: string | null = null;

//   constructor(
//     private afAuth: AngularFireAuth,
//     private afStorage: AngularFireStorage,
//     private modalCtrl: ModalController,
//     private router: Router,
//     private profileService: ProfileService,
//     private photoService: PhotoService,
//     private alertCtrl: AlertController
//   ) {}

//   ngOnInit() {
//     this.loadUser();
//   }

//   async takePhoto() {
//     const modal = await this.modalCtrl.create({
//       component: LoadingModalComponent
//     });
//     await modal.present();

//     try {
//       const image = await this.photoService.addPhoto();

//       if (image) {
//         const imageBlob = this.dataURLtoBlob(image.dataUrl);
//         const user = await this.afAuth.currentUser;
//         if (user) {
//           const filePath = `profile_pictures/${user.uid}/${new Date().getTime()}.jpg`;
//           const fileRef = this.afStorage.ref(filePath);
//           const task = this.afStorage.upload(filePath, imageBlob);

//           await new Promise<void>((resolve, reject) => {
//             task.snapshotChanges().pipe(
//               finalize(async () => {
//                 try {
//                   const downloadURL = await fileRef.getDownloadURL().toPromise();
//                   await user.updateProfile({ photoURL: downloadURL });
//                   this.photoURL = downloadURL;  // Actualiza la URL en la interfaz
//                   resolve();
//                 } catch (error) {
//                   reject(error);
//                 }
//               })
//             ).subscribe();
//           });
//         }
//       } else {
//         console.warn('No se tomó ninguna foto.');
//       }

//     } catch (error) {
//       console.error('Error al tomar la foto:', error);
//       await this.showAlert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
//     } finally {
//       await modal.dismiss();
//     }
//   }

//   async loadUser() {
//     const user = await this.afAuth.currentUser;
//     if (user) {
//       this.user = user;
//       this.newName = user.displayName || '';
//       this.newEmail = user.email || '';
//       this.photoURL = user.photoURL || '';
//     }
//   }

//   async updateProfile() {
//     try {
//       const user = await this.afAuth.currentUser;
//       if (user) {
//         if (this.newName !== user.displayName) {
//           await user.updateProfile({ displayName: this.newName });
//         }
//         if (this.newEmail !== user.email) {
//           await user.updateEmail(this.newEmail);
//         }
//         if (this.selectedFile) {
//           await this.uploadProfilePicture(user);
//         }
//         this.profileService.updateProfile(user);
//         await this.showAlert('Éxito', 'Perfil actualizado correctamente.');
//         this.router.navigate(['/home']);
//       }
//     } catch (error) {
//       await this.showAlert('Error', 'No se pudo actualizar el perfil. Intenta de nuevo.');
//     }
//   }

//   async uploadProfilePicture(user: any) {
//     if (!this.selectedFile) return;
    
//     const filePath = `profile_pictures/${user.uid}/${this.selectedFile.name}`;
//     const fileRef = this.afStorage.ref(filePath);
//     const task = this.afStorage.upload(filePath, this.selectedFile);

//     return new Promise<void>((resolve, reject) => {
//       task.snapshotChanges().pipe(
//         finalize(async () => {
//           try {
//             const downloadURL = await fileRef.getDownloadURL().toPromise();
//             await user.updateProfile({ photoURL: downloadURL });
//             this.photoURL = downloadURL;  // Actualiza la URL en la interfaz
//             resolve();
//           } catch (error) {
//             reject(error);
//           }
//         })
//       ).subscribe();
//     });
//   }

//   async showAlert(header: string, message: string) {
//     const alert = await this.alertCtrl.create({
//       header,
//       message,
//       buttons: ['OK']
//     });
//     await alert.present();
//   }

//   async handleFileInput(event: Event) {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files[0]) {
//       this.selectedFile = input.files[0];

//       const modal = await this.modalCtrl.create({
//         component: LoadingModalComponent
//       });
//       await modal.present();

//       const reader = new FileReader();
//       reader.onload = (e: any) => {
//         this.photoURL = e.target.result;  // Vista previa de la imagen seleccionada
//       };
//       reader.readAsDataURL(this.selectedFile);

//       setTimeout(async () => {
//         await modal.dismiss();
//       }, 3000);
//     }
//   }

//   private dataURLtoBlob(dataURL: string): Blob {
//     const byteString = atob(dataURL.split(',')[1]);
//     const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    
//     const ab = new ArrayBuffer(byteString.length);
//     const ia = new Uint8Array(ab);
//     for (let i = 0; i < byteString.length; i++) {
//       ia[i] = byteString.charCodeAt(i);
//     }
    
//     return new Blob([ab], { type: mimeString });
//   }

//   goToHome() {
//     this.router.navigate(['/home']);
//   }
// }



